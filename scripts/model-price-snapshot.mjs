#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

export const PRICE_SOURCE = 'https://openrouter.ai/api/v1/models';
export const MAX_PRICE_DELTA = 0.5;
const priceKeys = ['inputPrice', 'outputPrice'];

export function pricePerMillion(value) {
  if (!['string', 'number'].includes(typeof value) || !/^(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(String(value))) return null;
  const price = Number(value) * 1_000_000;
  if (!Number.isFinite(price) || price < 0) return null;
  if (price === 0 && /[1-9]/.test(String(value).split(/e/i)[0])) return null;
  return Number(price.toPrecision(12));
}

export function planPriceSnapshot(models, catalogue, checkedAt) {
  if (!Array.isArray(models) || !models.length || new Set(models.map(model => model.id)).size !== models.length) throw new Error('The tracked roster is empty or has duplicate IDs');
  if (!Number.isFinite(Date.parse(checkedAt))) throw new Error('Invalid check timestamp');
  if (!Array.isArray(catalogue?.data) || !catalogue.data.length) throw new Error('The catalogue is empty or malformed');
  const entries = new Map();
  for (const entry of catalogue.data) {
    if (typeof entry.id !== 'string' || !entry.id || entries.has(entry.id)) throw new Error('The catalogue has missing or duplicate model IDs');
    entries.set(entry.id, entry);
  }
  const matched = models.filter(model => entries.has(model.id)).length;
  if (matched < Math.ceil(models.length * 0.8)) throw new Error(`Only ${matched} of ${models.length} tracked IDs matched. Refusing a potentially incomplete catalogue.`);
  const checks = [];
  const updated = models.map(model => {
    const copy = structuredClone(model), entry = entries.get(model.id);
    const before = { inputPrice: model.inputPrice, outputPrice: model.outputPrice };
    const quoted = entry ? { inputPrice: pricePerMillion(entry.pricing?.prompt), outputPrice: pricePerMillion(entry.pricing?.completion) } : { inputPrice: null, outputPrice: null };
    const issues = [];
    copy.pricingSource = PRICE_SOURCE; copy.pricingCheckedAt = checkedAt;
    if (!entry) {
      copy.inputPrice = null; copy.outputPrice = null; copy.pricingStatus = 'not-listed';
    } else {
      const locked = new Set(model.lockedFields ?? []);
      for (const key of priceKeys) {
        const old = model[key], next = quoted[key];
        if (next === old) continue;
        if (locked.has(key)) { issues.push({ field: key, reason: 'locked', previous: old, quoted: next }); continue; }
        if (next !== null && Number.isFinite(old) && (old === 0 ? next !== 0 : Math.abs(next - old) / old > MAX_PRICE_DELTA)) {
          issues.push({ field: key, reason: 'delta-over-50-percent', previous: old, quoted: next }); continue;
        }
        copy[key] = next;
      }
      copy.pricingStatus = priceKeys.some(key => quoted[key] === null) ? 'unverified'
        : priceKeys.some(key => quoted[key] !== copy[key]) ? 'review-needed' : 'verified';
    }
    checks.push({ id: model.id, status: copy.pricingStatus, previous: before, quoted,
      applied: { inputPrice: copy.inputPrice, outputPrice: copy.outputPrice }, issues });
    return copy;
  });
  const count = status => checks.filter(check => check.status === status).length;
  return { models: updated, checks, summary: { catalogueModels: entries.size, trackedModels: models.length, matched,
    verified: count('verified'), notListed: count('not-listed'), reviewNeeded: count('review-needed'), unverified: count('unverified'),
    priceChanges: checks.filter(check => priceKeys.some(key => check.previous[key] !== check.applied[key])).length } };
}

export async function runPriceSnapshot({ write = false } = {}) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const start = Date.now();
  const response = await fetch(PRICE_SOURCE, { signal: AbortSignal.timeout(30_000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Catalogue request failed with HTTP ${response.status}`);
  const raw = await response.text();
  if (raw.length > 20_000_000) throw new Error('Catalogue response exceeded the expected size limit');
  const checkedAt = new Date().toISOString();
  const modelsPath = resolve(root, 'src/data/models.json');
  const models = JSON.parse(await readFile(modelsPath, 'utf8'));
  const plan = planPriceSnapshot(models, JSON.parse(raw), checkedAt);
  const runId = process.env.GITHUB_RUN_ID;
  const workflowUrl = process.env.GITHUB_REPOSITORY === 'valorifutures/softcat.ai' && /^\d+$/.test(runId ?? '')
    ? `https://github.com/valorifutures/softcat.ai/actions/runs/${runId}` : null;
  const snapshot = { checkedAt, source: PRICE_SOURCE, sourceSha256: createHash('sha256').update(raw).digest('hex'),
    workflowUrl, maxAutoDelta: MAX_PRICE_DELTA, ...plan.summary, checks: plan.checks };
  if (write) {
    const runsPath = resolve(root, 'src/data/pipeline/runs.json');
    const runs = JSON.parse(await readFile(runsPath, 'utf8'));
    if (!Array.isArray(runs)) throw new Error('The run history is not an array. Refusing to replace it.');
    const cutoff = Date.now() - 90 * 86_400_000;
    const history = runs.filter(run => !Number.isFinite(Date.parse(run.timestamp)) || Date.parse(run.timestamp) >= cutoff);
    const run = { bot: 'model_bot', job: 'prices', runner: workflowUrl ? 'github-actions' : 'manual',
      timestamp: checkedAt, status: plan.summary.reviewNeeded || plan.summary.unverified ? 'partial' : 'success',
      duration_s: Math.round((Date.now() - start) / 100) / 10, feeds_scanned: 1, items_found: plan.summary.catalogueModels,
      items_rejected: plan.summary.reviewNeeded + plan.summary.unverified, items_published: 1,
      model: '', cost_usd: 0, input_tokens: 0, output_tokens: 0,
      output_files: ['src/data/models.json', 'src/data/model-price-snapshot.json'],
      models_checked: models.length, models_verified: plan.summary.verified, models_not_listed: plan.summary.notListed,
      ...(workflowUrl ? { workflow_url: workflowUrl } : {}) };
    const json = value => JSON.stringify(value, null, 2) + '\n';
    // All parsing and catalogue checks finish before any file is changed.
    await writeFile(modelsPath, json(plan.models));
    await writeFile(resolve(root, 'src/data/model-price-snapshot.json'), json(snapshot));
    await writeFile(runsPath, json([...history, run]));
  }
  console.log(JSON.stringify({ write, checkedAt, ...plan.summary, workflowUrl }));
  return snapshot;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--write')) throw new Error('Usage: node scripts/model-price-snapshot.mjs [--write]');
  runPriceSnapshot({ write: args.includes('--write') }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
