import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildAuthorityReplay, replayFrame } from '../../src/lib/authority-replay.mjs';
const source = JSON.parse(readFileSync(new URL('../../research/boundary/results/latest.json', import.meta.url)));
const replay = buildAuthorityReplay(source);
const scenario = id => replay.scenarios.find(item => item.id === id);

test('replay preserves the recorded date, grade and original cases without modifying evidence', () => {
  const copy = structuredClone(source);
  const output = buildAuthorityReplay(copy);
  assert.deepEqual(copy, source);
  assert.equal(output.recordedAt, source.generatedAt);
  assert.equal(output.scenarios.length, 4);
  for (const item of output.scenarios) assert.deepEqual(item.raw, source.runs.find(run => run.id === item.id));
});
test('withdrawal refuses A, confirms its absence, and still permits B', () => {
  const run = scenario('revoked_inflight');
  assert.deepEqual(run.frames.map(frame => frame.status), ['PENDING', 'REVOKED', 'DENIED', 'ABSENT', 'PENDING', 'COMMITTED']);
  assert.deepEqual(run.frames.map(frame => frame.queue.length), [0, 0, 0, 0, 0, 1]);
  assert.equal(run.frames[2].reason, 'REVOKED');
  assert.deepEqual(run.queue.map(effect => effect.job), ['B']);
});
test('authorised action is pending until the commit response and durable event agree', () => {
  const run = scenario('authorised');
  assert.equal(run.frames[0].queue.length, 0);
  assert.equal(run.frames[1].status, 'COMMITTED');
  assert.equal(run.frames[1].queue.length, 1);
});
test('identical retry returns the original receipt and never counts two effects', () => {
  const run = scenario('identical_retry');
  assert.equal(run.frames[3].status, 'REPLAY');
  assert.equal(run.frames[3].receipt.action_id, run.frames[1].receipt.action_id);
  assert.deepEqual(run.frames.map(frame => frame.queue.length), [0, 1, 1, 1]);
});
test('lost reply stays unknown to the caller until lookup reconciles the durable commit', () => {
  const run = scenario('lost_reply_restart');
  assert.deepEqual(run.frames.map(frame => frame.status), ['PENDING', 'NO_RESPONSE', 'FOUND']);
  assert.equal(run.frames[1].queue, null);
  assert.equal(run.frames[1].receipt, null);
  assert.equal(run.frames[1].event.status, 'COMMITTED');
  assert.equal(run.frames[2].queue.length, 1);
  assert.equal(run.frames[2].receipt.action_id, run.frames[1].event.receipt.action_id);
});
test('frame selection bounds invalid and out-of-range positions', () => {
  const run = scenario('authorised');
  for (const position of [-1, NaN, Infinity, undefined]) assert.equal(replayFrame(run, position), null);
  assert.equal(replayFrame(run, 99), run.frames[1]);
  assert.equal(replayFrame(run, 1.9), run.frames[0]);
});
test('incomplete, contradictory or unfamiliar evidence fails closed', () => {
  const mutations = [
    copy => { copy.schemaVersion = 2; },
    copy => { copy.runs = copy.runs.filter(run => run.id !== 'authorised'); },
    copy => { copy.runs.find(run => run.id === 'authorised').grade.passed = false; },
    copy => { copy.runs.find(run => run.id === 'authorised').trace.calls[1].response.status = 'SUCCESS_PROBABLY'; },
    copy => { copy.runs.find(run => run.id === 'authorised').trace.snapshot.queue = []; },
    copy => { const trace = copy.runs.find(run => run.id === 'revoked_inflight').trace; trace.calls[2].response.reason = trace.snapshot.events[2].reason = 'SCOPE_MISMATCH'; },
    copy => { copy.runs.find(run => run.id === 'identical_retry').trace.calls[3].response.receipt.action_id = 'extra-effect'; },
    copy => { copy.runs.find(run => run.id === 'lost_reply_restart').trace.process_exits = [0]; },
  ];
  for (const mutate of mutations) { const copy = structuredClone(source); mutate(copy); assert.throws(() => buildAuthorityReplay(copy), /Replay evidence unavailable/); }
});
