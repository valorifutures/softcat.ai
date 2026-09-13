import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker as NodeWorker } from 'node:worker_threads';
import { comparePrompts, formatSignedUsd, DIFF_INPUT_LIMIT } from '../../src/lib/prompt-diff.mjs';
import { startPromptDiff } from '../../src/lib/prompt-diff-runner.mjs';
const reconstruct = (result, side) => result.changes.filter((part) => part.type !== (side === 'A' ? 'added' : 'removed')).map((part) => part.value).join('');

test('word comparisons reconstruct both original strings exactly, including whitespace and Unicode', () => {
  const cases = ['', 'cat', 'dog', 'cat dog', 'cat  dog', '\ncat\tdog\n', 'café 😀 猫', 'a b a b', 'b a b a', '\r\n'];
  for (const a of cases) for (const b of cases) {
    const result = comparePrompts(a, b);
    assert.equal(reconstruct(result, 'A'), a);
    assert.equal(reconstruct(result, 'B'), b);
    assert.equal(result.status === 'identical', a === b);
    assert.ok(result.changes.every((part) => ['equal', 'removed', 'added'].includes(part.type)));
  }
});

test('shared boundaries remain intact and a single inserted word is marked as added', () => {
  const result = comparePrompts('Read the file carefully.', 'Read the small file carefully.');
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.changes.filter((part) => part.type === 'added'), [{ type: 'added', value: 'small ' }]);
  assert.equal(result.changes.filter((part) => part.type === 'removed').length, 0);
});

test('large different inputs use explicit coarse blocks while preserving all text', () => {
  const a = 'shared\n' + 'old item '.repeat(5000) + '\nend';
  const b = 'shared\n' + 'new entry '.repeat(5000) + '\nend';
  const result = comparePrompts(a, b);
  assert.equal(result.status, 'coarse');
  assert.ok(result.changes.length <= 4);
  assert.equal(reconstruct(result, 'A'), a);
  assert.equal(reconstruct(result, 'B'), b);
  assert.match(result.message, /Shared text may remain/);
});

test('the display limit also falls back without truncating either prompt', () => {
  const a = 'a x b y c z', b = 'a p b q c r';
  const result = comparePrompts(a, b, { maxSegments: 2 });
  assert.equal(result.status, 'coarse');
  assert.equal(reconstruct(result, 'A'), a);
  assert.equal(reconstruct(result, 'B'), b);
});

test('equal large prompts avoid detailed work and oversized prompts return a limit result', () => {
  const text = 'a'.repeat(DIFF_INPUT_LIMIT);
  assert.equal(comparePrompts(text, text).status, 'identical');
  assert.equal(comparePrompts(text + 'a', text).status, 'limit');
  assert.equal(comparePrompts(null, '').status, 'limit');
});

test('cost reductions retain their minus sign, including small amounts', () => {
  assert.equal(formatSignedUsd(-0.000005, true), '−$0.000005');
  assert.equal(formatSignedUsd(0.000005, true), '+$0.000005');
  assert.equal(formatSignedUsd(0, true), '$0');
  assert.equal(formatSignedUsd(null, true), 'Unknown');
  assert.equal(formatSignedUsd(NaN), 'Unknown');
});

test('editing or cancelling a worker prevents its late result from replacing the current state', () => {
  let stopped = 0, received = 0;
  const worker = { postMessage() {}, terminate() { stopped++; } };
  const stop = startPromptDiff('a', 'b', () => received++, { createWorker: () => worker });
  stop(); worker.onmessage({ data: comparePrompts('a', 'b') });
  assert.equal(stopped, 1); assert.equal(received, 0);
  let constructed = 0;
  startPromptDiff('x'.repeat(DIFF_INPUT_LIMIT + 1), '', (result) => assert.equal(result.status, 'limit'), { createWorker: () => { constructed++; return worker; } });
  assert.equal(constructed, 0);
});

test('a stuck real worker is terminated at the comparison deadline', { timeout: 5000 }, async () => {
  let terminated = false;
  const result = await new Promise((resolve) => startPromptDiff('a', 'b', resolve, {
    timeoutMs: 30,
    createWorker() {
      const worker = new NodeWorker('while (true) {}', { eval: true });
      return { postMessage() {}, terminate() { terminated = true; worker.terminate(); } };
    },
  }));
  assert.equal(result.status, 'timeout'); assert.equal(terminated, true); assert.deepEqual(result.changes, []);
});
