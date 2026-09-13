#!/usr/bin/env node
// Horizon Map cross-reference validator (Step 4.5 of the v1 plan).
// Per-entry shape is already enforced by the Zod schemas in src/content.config.ts
// at build time. This script covers what Zod cannot: relationships between files.
//
//   1. Global id uniqueness across all lanes (past, now, now-archive, next,
//      debates, scenarios).
//   2. `related[]` targets resolve to a known horizon id.
//   3. `evidence[].ref` / `origin.ref` with type radar|news|thought resolve to
//      an existing content file; type paper|external is passed through.
//   4. Debate `for.supporting` / `against.supporting` resolve to a known id.
//   5. Scenario `related[]` resolves to a known id.
//   6. Next-lane `confidence_last_reviewed` older than 90 days produces a
//      warning; older than 180 days is an error (TODOS.md #1).
//
// Errors fail the run (exit 1). Warnings do not.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { retiredThoughtReferenceError } from '../src/lib/editorial-retirements.mjs';
import { FUTURES, STANCES } from '../src/lib/horizon-explorer.mjs';
import { validateClockPayload } from '../src/lib/horizon-clocks.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const HORIZON_DIR = join(ROOT, 'src/data/horizon');
const RADAR_DIR = join(ROOT, 'src/data/radar');
const THOUGHTS_DIR = join(ROOT, 'src/content/thoughts');
const NEWS_DIR = join(ROOT, 'src/content/news-and-updates');

const WARN_DAYS = 90;
// TODOS #1: stale forecasts on a forecasting page are a credibility hit. v1
// shipped warn-only at 90d while editorial cadence calibrated; this escalates
// to a build failure at 180d. A fresh date requires an actual evidence review.
const FAIL_DAYS = 180;

const errors = [];
const warnings = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listBasenames(dir, ext) {
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter((f) => f.endsWith(ext))
      .map((f) => f.slice(0, -ext.length)),
  );
}

const past = readJson(join(HORIZON_DIR, 'past.json'));
const now = readJson(join(HORIZON_DIR, 'now.json'));
const nowArchive = readJson(join(HORIZON_DIR, 'now-archive.json'));
const next = readJson(join(HORIZON_DIR, 'next.json'));
const retired = readJson(join(HORIZON_DIR, 'retired-forecasts.json'));
const debates = readJson(join(HORIZON_DIR, 'debates.json'));
const scenarios = readJson(join(HORIZON_DIR, 'scenarios.json'));
const review = readJson(join(HORIZON_DIR, 'outlook-review.json'));
const history = readJson(join(HORIZON_DIR, 'clock-history.json'));
const briefs = readJson(join(HORIZON_DIR, 'decision-briefs.json'));
const payload = { schema: 1, revision: '0'.repeat(64), scenarios, review, history, briefs };
errors.push(...validateClockPayload(payload));

// A review is an append-only record, checked against the published Git history.
// Full checkout history is required by the PR, Pages and automation workflows.
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const historyPath = 'src/data/horizon/clock-history.json';
try {
  const originalSha = '3066df13e0493ef1446c9a3e48f307aa8bf30e5f';
  const original = JSON.parse(git(['show', `${originalSha}:src/data/horizon/scenarios.json`]));
  const baseline = FUTURES.map(({ id }) => {
    const scenario = original.find(item => item.id === id);
    return { id, definition: scenario.definition, timeframes: Object.fromEntries(STANCES.map(stance => [stance, scenario[stance].timeframe])) };
  });
  if (!isDeepStrictEqual(history[0]?.records, baseline) || history[0]?.source !== `https://github.com/valorifutures/softcat.ai/blob/${originalSha}/src/data/horizon/scenarios.json`) errors.push('The clock baseline differs from its preserved original Git source.');
  const refs = new Set(['HEAD']);
  // A source checkout without a remote can still validate its tracked records.
  if (git(['for-each-ref', '--format=%(refname)', 'refs/remotes/origin/main'])) refs.add('origin/main');
  if (process.env.GITHUB_EVENT_PATH) {
    const event = readJson(process.env.GITHUB_EVENT_PATH);
    const before = event.pull_request?.base?.sha || event.before;
    if (before && /^[a-f0-9]{40}$/.test(before) && !/^0+$/.test(before)) refs.add(before);
  }
  for (const ref of refs) {
    if (!git(['ls-tree', '-r', '--name-only', ref, '--', historyPath])) continue; // introduction of this file
    const previous = JSON.parse(git(['show', `${ref}:${historyPath}`]));
    errors.push(...validateClockPayload(payload, previous).map(error => `${ref}: ${error}`));
  }
} catch (error) { errors.push(`Clock history could not be checked against Git: ${error.message}`); }

const radarRefs = listBasenames(RADAR_DIR, '.json');
const thoughtRefs = listBasenames(THOUGHTS_DIR, '.md');
const retiredThoughtRefs = new Set(readJson(join(ROOT, 'src/data/editorial-retirements.json')).entries.map(entry => entry.id));
const newsRefs = listBasenames(NEWS_DIR, '.md');

// 1. Global id uniqueness.
const seen = new Map();
function registerId(id, source) {
  if (!id) return;
  if (seen.has(id)) {
    errors.push(`Duplicate id "${id}" in ${source} — already defined in ${seen.get(id)}`);
  } else {
    seen.set(id, source);
  }
}
for (const e of past) registerId(e.id, 'past.json');
for (const e of now) registerId(e.id, 'now.json');
for (const e of nowArchive) registerId(e.id, 'now-archive.json');
for (const e of next) registerId(e.id, 'next.json');
for (const e of retired) registerId(e.id, 'retired-forecasts.json');
for (const e of debates) registerId(e.id, 'debates.json');
for (const e of scenarios) registerId(e.id, 'scenarios.json');

const laneIds = new Set([
  ...past.map((e) => e.id),
  ...now.map((e) => e.id),
  ...nowArchive.map((e) => e.id),
  ...next.map((e) => e.id),
  ...retired.map((e) => e.id),
]);

function checkRelated(entry, source) {
  if (!entry.related) return;
  for (const ref of entry.related) {
    if (!laneIds.has(ref)) {
      errors.push(`${source}: "${entry.id}" related[] -> unknown id "${ref}"`);
    }
  }
}

function checkEvidenceRef(type, ref, owner, source) {
  if (type === 'radar') {
    if (!radarRefs.has(ref)) {
      errors.push(`${source}: "${owner}" evidence radar ref "${ref}" has no src/data/radar/${ref}.json`);
    }
  } else if (type === 'thought') {
    if (retiredThoughtRefs.has(ref)) {
      const error = retiredThoughtReferenceError(type, ref, source, retiredThoughtRefs);
      if (error) errors.push(error);
      return;
    }
    if (!thoughtRefs.has(ref)) {
      errors.push(`${source}: "${owner}" evidence thought ref "${ref}" has no src/content/thoughts/${ref}.md`);
    }
  } else if (type === 'news') {
    if (!newsRefs.has(ref)) {
      errors.push(`${source}: "${owner}" evidence news ref "${ref}" has no src/content/news-and-updates/${ref}.md`);
    }
  }
  // paper / external: freeform, skipped.
}

function checkEvidence(entry, source) {
  if (!entry.evidence) return;
  for (const ev of entry.evidence) {
    checkEvidenceRef(ev.type, ev.ref, entry.id, source);
  }
}

function checkOrigin(entry, source) {
  if (!entry.origin) return;
  const { type, ref } = entry.origin;
  checkEvidenceRef(type, ref, entry.id, source);
}

function checkLane(arr, source) {
  for (const entry of arr) {
    checkRelated(entry, source);
    checkEvidence(entry, source);
    checkOrigin(entry, source);
  }
}

checkLane(past, 'past.json');
checkLane(now, 'now.json');
checkLane(nowArchive, 'now-archive.json');
checkLane(next, 'next.json');
checkLane(retired, 'retired-forecasts.json');

// Debate supporting[] -> lane ids.
for (const d of debates) {
  for (const side of ['for', 'against']) {
    const refs = d[side]?.supporting ?? [];
    for (const ref of refs) {
      if (!laneIds.has(ref)) {
        errors.push(`debates.json: "${d.id}" ${side}.supporting -> unknown id "${ref}"`);
      }
    }
  }
}

// Scenario related[] -> lane ids.
for (const s of scenarios) {
  if (!s.related) continue;
  for (const ref of s.related) {
    if (!laneIds.has(ref)) {
      errors.push(`scenarios.json: "${s.id}" related[] -> unknown id "${ref}"`);
    }
  }
}

// Retain validation of the April 2026 representative years and bands.
// The current explorer plots timeframe wording, not these historical points.
const BAND_NEAR_MAX_DELTA = 4;   // 0-4 years out of currentYear
const BAND_MID_MAX_DELTA = 9;    // 5-9 years out
const BAND_FAR_MAX_DELTA = 19;   // 10-19 years out; 20+ is indefinite

function yearToBand(year, currentYear) {
  if (year == null) return 'indefinite';
  const delta = year - currentYear;
  if (delta <= BAND_NEAR_MAX_DELTA) return 'near';
  if (delta <= BAND_MID_MAX_DELTA) return 'mid';
  if (delta <= BAND_FAR_MAX_DELTA) return 'far';
  return 'indefinite';
}

const CURRENT_YEAR = new Date().getUTCFullYear();
for (const s of scenarios) {
  // debate_ref must resolve to an existing debate id.
  if (s.debate_ref) {
    const debateIds = new Set(debates.map((d) => d.id));
    if (!debateIds.has(s.debate_ref)) {
      errors.push(`scenarios.json: "${s.id}" debate_ref -> unknown debate id "${s.debate_ref}"`);
    }
  }
  // Band/year consistency (warning — bot drift without band update is expected).
  for (const stance of ['optimistic', 'pragmatic', 'sceptical']) {
    const entry = s[stance];
    if (!entry || !entry.band) continue;
    const { year, band } = entry;
    if (band === 'indefinite' && year != null) {
      warnings.push(
        `scenarios.json: "${s.id}" ${stance} has band="indefinite" but year=${year} (year will be ignored at render)`,
      );
      continue;
    }
    if (band !== 'indefinite' && year != null) {
      const derived = yearToBand(year, CURRENT_YEAR);
      if (derived !== band) {
        warnings.push(
          `scenarios.json: "${s.id}" ${stance} band="${band}" does not match year-derived band="${derived}" (year=${year}, currentYear=${CURRENT_YEAR})`,
        );
      }
    }
  }
}

// shifts.json — optional `changes` array on scenarios-touching entries.
// Emitted by bot/horizon_bot.py when a commit touches scenarios.json.
let shifts = [];
try {
  shifts = readJson(join(HORIZON_DIR, 'shifts.json'));
} catch {
  // shifts.json may not exist in a minimal checkout; not an error.
}
const STANCE_SET = new Set(['optimistic', 'pragmatic', 'sceptical']);
for (let i = 0; i < shifts.length; i++) {
  const shift = shifts[i];
  if (!shift.changes) continue;
  if (!Array.isArray(shift.changes)) {
    errors.push(`shifts.json[${i}]: changes must be an array`);
    continue;
  }
  for (let j = 0; j < shift.changes.length; j++) {
    const c = shift.changes[j];
    if (typeof c.horizon !== 'string' || !c.horizon) {
      errors.push(`shifts.json[${i}].changes[${j}]: missing or invalid horizon field`);
    }
    if (!STANCE_SET.has(c.stance)) {
      errors.push(`shifts.json[${i}].changes[${j}]: stance must be one of ${[...STANCE_SET].join('|')}`);
    }
    if (c.delta_months != null && typeof c.delta_months !== 'number') {
      errors.push(`shifts.json[${i}].changes[${j}]: delta_months must be number or null`);
    }
  }
}

// 6. Next-lane confidence freshness: warn at 90d, fail at 180d (TODOS #1).
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
for (const entry of next) {
  const reviewed = entry.confidence_last_reviewed;
  if (!reviewed) { errors.push(`next.json: "${entry.id}" has no review date`); continue; }
  if (!entry.target_date || !entry.review_note || !entry.resolution_criteria || !entry.evidence?.some(ev => ev.type === 'external' || ev.type === 'paper')) {
    errors.push(`next.json: "${entry.id}" needs a target date, review note, resolution criteria and a direct source`);
  }
  const d = new Date(reviewed + 'T00:00:00Z');
  const ageDays = Math.floor((today - d) / 86_400_000);
  if (!Number.isFinite(ageDays) || ageDays < 0 || d.toISOString().slice(0, 10) !== reviewed) {
    errors.push(`next.json: "${entry.id}" has an invalid or future review date`);
  } else if (ageDays > FAIL_DAYS) {
    errors.push(
      `next.json: "${entry.id}" confidence_last_reviewed is ${ageDays} days old (> ${FAIL_DAYS}d fail threshold) — reassess the evidence or withdraw the forecast`,
    );
  } else if (ageDays > WARN_DAYS) {
    warnings.push(
      `next.json: "${entry.id}" confidence_last_reviewed is ${ageDays} days old (> ${WARN_DAYS}d warn threshold)`,
    );
  }
}

for (const w of warnings) console.warn(`warn: ${w}`);
for (const e of errors) console.error(`error: ${e}`);

const total = past.length + now.length + nowArchive.length + next.length + retired.length + debates.length + scenarios.length;
console.log(
  `\nhorizon validator: ${total} entries, ${errors.length} error(s), ${warnings.length} warning(s)`,
);

if (errors.length > 0) process.exit(1);
