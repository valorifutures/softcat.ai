#!/usr/bin/env node
/** Validate a candidate's scope and a fresh, append-only critic record.
 * Run the copy from the trusted base before checking out candidate code.
 * This validates repository output. It is not a sandbox or a content review.
 */
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

const roots = ['src/pages/feral/', 'src/content/feral/', 'public/feral/'];
const ledgerPath = 'src/content/feral/ledger.json';
const hasText = value => typeof value === 'string' && value.trim().length > 0;

export function checkFeralCandidate({ changed, previous, ledger, today = new Date().toISOString().slice(0, 10) }) {
  if (!changed.length) return { ok: false, noop: true, reason: 'No changes to publish.' };
  const outside = changed.filter(path => !roots.some(root => path.startsWith(root)));
  if (outside.length) return { ok: false, reason: `Files outside Feral: ${outside.join(', ')}` };
  if (!Array.isArray(previous) || !Array.isArray(ledger)) return { ok: false, reason: 'Both ledgers must be arrays.' };
  if (ledger.length !== previous.length + 1) return { ok: false, reason: 'Append exactly one new cycle. An old PASS cannot approve new work.' };
  if (!isDeepStrictEqual(previous, ledger.slice(0, previous.length))) return { ok: false, reason: 'Earlier ledger entries must remain unchanged.' };
  const latest = ledger.at(-1);
  const prior = previous.at(-1);
  if (!Number.isSafeInteger(latest?.cycle) || latest.cycle !== (prior?.cycle ?? -1) + 1) return { ok: false, reason: 'The new cycle number must follow the previous cycle.' };
  const date = latest.date;
  const parsed = new Date(`${date}T00:00:00Z`);
  const age = (Date.parse(`${today}T00:00:00Z`) - parsed.getTime()) / 86_400_000;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? '') || !Number.isFinite(age) || parsed.toISOString().slice(0, 10) !== date || age < 0 || age > 1 || (prior && date < prior.date)) return { ok: false, reason: 'The new cycle needs a valid current UTC date (today or yesterday for overnight runs).' };
  if (latest.critic?.verdict !== 'PASS') return { ok: false, reason: `Cycle ${latest.cycle} critic verdict is ${latest.critic?.verdict ?? 'missing'}, not PASS.` };
  if (!hasText(latest.critic.reasons) || !Number.isInteger(latest.critic.attempts) || latest.critic.attempts < 1 || latest.critic.attempts > 3) return { ok: false, reason: 'The critic must record reasons and one to three attempts.' };
  if (![latest.director?.decided, latest.director?.why, latest.builder?.made, latest.builder?.how, latest.mood].every(hasText)) return { ok: false, reason: 'The new cycle needs a complete direction, build record and mood.' };
  if (!Array.isArray(latest.builder.shipped) || !latest.builder.shipped.every(route => typeof route === 'string' && /^\/feral\/[a-z0-9][a-z0-9/-]*$/.test(route))) return { ok: false, reason: 'Shipped routes must be paths inside /feral/.' };
  return { ok: true, cycle: latest.cycle, files: changed.length };
}

export function inspectFeralRepository(baseRef = 'origin/main', candidateRef = 'HEAD') {
  const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  const commit = ref => git('rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`).trim();
  const base = commit(baseRef);
  const candidate = commit(candidateRef);
  git('merge-base', '--is-ancestor', base, candidate);
  const changed = git('diff', '--name-only', '--no-renames', '-z', base, candidate, '--').split('\0').filter(Boolean);
  // Symlinks and gitlinks can reach outside the apparent path boundary.
  const invalidModes = git('ls-tree', '-r', '-z', candidate).split('\0').filter(Boolean).filter(line => {
    const [meta, path] = line.split('\t');
    return changed.includes(path) && !['100644', '100755'].includes(meta.split(' ')[0]);
  });
  if (invalidModes.length) return { ok: false, reason: 'Changed Feral files must be regular files, not symlinks or submodules.' };
  return checkFeralCandidate({ changed, previous: JSON.parse(git('show', `${base}:${ledgerPath}`)), ledger: JSON.parse(git('show', `${candidate}:${ledgerPath}`)) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = inspectFeralRepository(process.argv[2], process.argv[3]);
    console.log(result.ok ? `FERAL GATE: PASS. Cycle ${result.cycle}, ${result.files} changed files.` : `FERAL GATE: BLOCKED. ${result.reason}`);
    process.exitCode = result.ok ? 0 : result.noop ? 78 : 1;
  } catch (error) {
    console.error(`FERAL GATE: BLOCKED. Could not verify candidate: ${error.message}`);
    process.exitCode = 1;
  }
}
