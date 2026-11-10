import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { executeHarness, checksPassed, deterministicRecord } from './run.mjs';

const cli = fileURLToPath(new URL('./run.mjs', import.meta.url));
test('all scheduled baseline, deficient-control and adversarial cases are accounted for', async () => {
  const report = await executeHarness();
  assert.equal(checksPassed(report), true);
  assert.equal(report.runs.length, 7);
  assert.equal(report.execution.modelCalls, 0);
  assert.equal(report.execution.actualCharge, null);
  assert.ok(report.execution.elapsedMs >= 0);
});
test('the published receipt matches the actual sources and regenerated outcomes', async () => {
  const saved = JSON.parse(await readFile(new URL('./results/latest.json', import.meta.url), 'utf8'));
  assert.deepEqual(deterministicRecord(await executeHarness()), deterministicRecord(saved));
});
test('CLI preserves existing evidence and rejects tampered outcomes and execution facts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'softcat-harness-'));
  try {
    const path = join(dir, 'receipt.json');
    await writeFile(path, 'retained failed run');
    assert.notEqual(spawnSync(process.execPath, [cli, '--out', path]).status, 0);
    assert.equal(await readFile(path, 'utf8'), 'retained failed run');
    const report = await executeHarness();
    report.runs[0].trace.queue = [];
    await writeFile(path, JSON.stringify(report));
    assert.notEqual(spawnSync(process.execPath, [cli, '--verify', path]).status, 0);
    const executionTamper = await executeHarness();
    executionTamper.execution.modelCalls = 999;
    executionTamper.execution.actualCharge = 0;
    await writeFile(path, JSON.stringify(executionTamper));
    assert.notEqual(spawnSync(process.execPath, [cli, '--verify', path]).status, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
