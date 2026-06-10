#!/usr/bin/env node
// Tools-data validator (eng D7/3A + E5 CI wiring).
// Checks src/data/models.json and src/data/tools-manifest.json beyond what
// the Astro build can see (models.json is imported as plain JSON, so schema
// drift would otherwise ship silently).
//
// Errors exit 1 (block merge). radarRef pointing at a PRUNED radar day-file
// is a WARNING only — pruning is expected (PR #143) and the build degrades
// the link to plain text by design.
//
// Run: node scripts/validate-tools-data.mjs   (wired into validate.yml)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const RADAR_REF = /^(\d{4}-\d{2}-\d{2})#(.+)$/;
const YEAR_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

// ---- models.json -----------------------------------------------------------
const models = JSON.parse(readFileSync(join(root, 'src/data/models.json'), 'utf8'));
if (!Array.isArray(models) || models.length === 0) {
  errors.push('models.json: must be a non-empty array');
}
const seen = new Set();
for (const m of models) {
  const at = `models.json[${m.id ?? '?'}]`;
  for (const k of ['id', 'name', 'provider', 'released', 'description', 'strengths']) {
    if (typeof m[k] !== 'string' || !m[k]) errors.push(`${at}: missing string field "${k}"`);
  }
  if (seen.has(m.id)) errors.push(`${at}: duplicate id`);
  seen.add(m.id);
  if (m.released && !YEAR_MONTH.test(m.released)) errors.push(`${at}: released must be YYYY-MM`);
  if (!ISO_DATE.test(m.trackedSince ?? '')) errors.push(`${at}: trackedSince must be YYYY-MM-DD`);
  for (const k of ['coding', 'reasoning_score', 'speed']) {
    if (!Number.isFinite(m[k]) || m[k] < 0 || m[k] > 100) errors.push(`${at}: ${k} must be 0-100`);
  }
  for (const k of ['inputPrice', 'outputPrice']) {
    if (!Number.isFinite(m[k]) || m[k] < 0) errors.push(`${at}: ${k} must be a number >= 0`);
  }
  if (!Number.isInteger(m.contextK) || m.contextK < 0) errors.push(`${at}: contextK must be a non-negative integer`);
  for (const k of ['openSource', 'reasoning', 'multimodal']) {
    if (typeof m[k] !== 'boolean') errors.push(`${at}: ${k} must be boolean`);
  }
  if (m.description?.includes('PLACEHOLDER') || m.strengths?.includes('PLACEHOLDER')) {
    errors.push(`${at}: PLACEHOLDER text must be edited before merge`);
  }
  if (m.radarRef !== undefined) {
    const match = RADAR_REF.exec(m.radarRef);
    if (!match) {
      errors.push(`${at}: radarRef must be "YYYY-MM-DD#entry-id"`);
    } else {
      const dayFile = join(root, 'src/data/radar', `${match[1]}.json`);
      if (!existsSync(dayFile)) {
        warnings.push(`${at}: radarRef day-file ${match[1]}.json pruned — link degrades to text`);
      } else {
        const day = JSON.parse(readFileSync(dayFile, 'utf8'));
        const ids = ['featured', 'items', 'launches']
          .flatMap((s) => day[s] ?? [])
          .map((e) => e.id);
        if (!ids.includes(match[2])) errors.push(`${at}: radarRef entry "${match[2]}" not in ${match[1]}.json`);
      }
    }
  }
}

// ---- tools-manifest.json ----------------------------------------------------
const manifest = JSON.parse(readFileSync(join(root, 'src/data/tools-manifest.json'), 'utf8'));
if (!Array.isArray(manifest) || manifest.length === 0) errors.push('tools-manifest.json: must be a non-empty array');
for (const t of manifest) {
  const at = `tools-manifest.json[${t.id ?? '?'}]`;
  for (const k of ['id', 'name', 'description', 'stat', 'href', 'icon', 'category']) {
    if (typeof t[k] !== 'string' || !t[k]) errors.push(`${at}: missing string field "${k}"`);
  }
  if (!ISO_DATE.test(t.addedDate ?? '')) errors.push(`${at}: addedDate must be YYYY-MM-DD`);
  if (t.dataSource !== undefined && t.dataSource !== 'models.json') {
    errors.push(`${at}: dataSource must be "models.json" when present`);
  }
}

for (const w of warnings) console.warn(`WARN  ${w}`);
for (const e of errors) console.error(`ERROR ${e}`);
console.log(`validate-tools-data: ${models.length} models, ${manifest.length} tools — ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
