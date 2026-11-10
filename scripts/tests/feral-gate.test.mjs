import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { checkFeralCandidate } from '../feral-gate.mjs';

const today = '2026-09-12';
const old = { cycle: 5, date: '2026-06-30', critic: { verdict: 'PASS' } };
const fresh = { cycle: 6, date: today, director: { decided: 'A new room.', why: 'To test an idea.' }, builder: { made: 'A page.', how: 'Static HTML.', shipped: ['/feral/new-room'] }, critic: { verdict: 'PASS', reasons: 'Build and review completed.', attempts: 1 }, mood: 'Curious.' };
const fixture = () => ({ changed: ['src/pages/feral/new-room.astro', 'src/content/feral/ledger.json'], previous: [structuredClone(old)], ledger: [structuredClone(old), structuredClone(fresh)], today });

test('requires a new PASS and preserves earlier records', () => {
  assert.equal(checkFeralCandidate(fixture()).ok, true);
  const stale = fixture(); stale.ledger.pop();
  assert.match(checkFeralCandidate(stale).reason, /old PASS/);
  const rewrite = fixture(); rewrite.ledger[0].date = today;
  assert.match(checkFeralCandidate(rewrite).reason, /unchanged/);
  const failed = fixture(); failed.ledger[1].critic.verdict = 'FAIL';
  assert.match(checkFeralCandidate(failed).reason, /not PASS/);
});

test('blocks missing details, skipped cycles, malformed and stale dates', () => {
  for (const mutate of [x => x.ledger[1].cycle++, x => x.ledger[1].critic.reasons = '', x => x.ledger[1].critic.attempts = 4, x => x.ledger[1].builder.shipped = ['/outside'], x => x.ledger[1].director = null, x => x.ledger[1].date = '2026-02-30', x => x.ledger[1].date = '2026-09-13', x => x.ledger[1].date = '2026-06-30']) {
    const data = fixture(); mutate(data); assert.equal(checkFeralCandidate(data).ok, false);
  }
  const overnight = fixture(); overnight.ledger[1].date = '2026-09-11';
  assert.equal(checkFeralCandidate(overnight).ok, true);
});

test('recognises no-op and checks both sides of moves via changed paths', () => {
  assert.equal(checkFeralCandidate({ ...fixture(), changed: [] }).noop, true);
  for (const path of ['scripts/feral-gate.mjs', '.github/workflows/feral.yml', 'src/pages/feralish/file.astro', 'src/pages/index.astro']) {
    assert.equal(checkFeralCandidate({ ...fixture(), changed: [...fixture().changed, path] }).ok, false);
  }
});

test('trusted CLI reads candidate commits before checkout and blocks symlinks', () => {
  const dir = mkdtempSync(`${tmpdir()}/feral-gate-`);
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const runGate = (...refs) => execFileSync(process.execPath, [resolve('scripts/feral-gate.mjs'), ...refs], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.invalid');
    mkdirSync(`${dir}/src/content/feral`, { recursive: true });
    const writeLedger = ledger => writeFileSync(`${dir}/src/content/feral/ledger.json`, JSON.stringify(ledger));
    writeLedger([old]); git('add', '.'); git('commit', '-qm', 'Base'); const base = git('rev-parse', 'HEAD');
    const entry = { ...fresh, date: new Date().toISOString().slice(0, 10) };
    writeLedger([old, entry]); git('add', '.'); git('commit', '-qm', 'Candidate'); const candidate = git('rev-parse', 'HEAD');
    git('checkout', '--detach', base);
    assert.match(runGate(base, candidate), /PASS/);
    git('checkout', '--detach', candidate);
    symlinkSync('/etc/passwd', `${dir}/src/content/feral/escape`); git('add', '.'); git('commit', '-qm', 'Symlink');
    assert.throws(() => runGate(base, 'HEAD'), /Command failed/);
    assert.throws(() => runGate('--invalid-ref', 'HEAD'), /Command failed/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
