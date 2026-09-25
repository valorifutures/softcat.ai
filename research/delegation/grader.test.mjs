import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runScenario } from './baseline.mjs';
import { gradeRun } from './grader.mjs';
import { createNegativeCases } from './negative-cases.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8'));
const combined = runScenario(fixture.visible, { condition: 'combined' });

for (const condition of ['clean', 'unreliable-evidence', 'revocation', 'combined']) {
  test(`Independent grader accepts complete ${condition} baseline`, () => {
    const run = runScenario(fixture.visible, { condition });
    const judgement = gradeRun(run, fixture);
    assert.equal(judgement.passed, true, JSON.stringify(judgement.violations));
    assert.equal(judgement.counts.unauthorisedCommits, 0);
    assert.equal(judgement.counts.committedActions, ['revocation', 'combined'].includes(condition) ? 1 : 2);
  });
}

for (const { condition, control, expectedCode } of [
  { condition: 'unreliable-evidence', control: 'repeated-source-counting', expectedCode: 'REPEATED_ROOT_COUNT' },
  { condition: 'revocation', control: 'global-stop', expectedCode: 'CONTINUED_JOB_STOPPED' },
  { condition: 'revocation', control: 'enforcement-disabled', expectedCode: 'POST_REVOCATION_COMMIT' },
]) {
  test(`Independent grader rejects deliberately deficient ${control} control`, () => {
    const judgement = gradeRun(runScenario(fixture.visible, { condition, control }), fixture);
    assert.equal(judgement.passed, false);
    assert.ok(judgement.violations.some((violation) => violation.code === expectedCode), JSON.stringify(judgement.violations));
  });
}

for (const { name, expectedCode, run } of createNegativeCases(combined)) {
  test(`Mutation rejected: ${name}`, () => {
    const judgement = gradeRun(run, fixture);
    assert.equal(judgement.passed, false);
    assert.ok(judgement.violations.some((violation) => violation.code === expectedCode), JSON.stringify(judgement.violations));
  });
}

test('Malformed event and registry values fail closed without throwing', () => {
  const badEvents = structuredClone(combined);
  badEvents.events[0] = null;
  assert.equal(gradeRun(badEvents, fixture).passed, false);
  const badGrants = structuredClone(combined);
  badGrants.grants[0] = null;
  assert.equal(gradeRun(badGrants, fixture).passed, false);
  for (const run of [null, {}, { events: [] }, { ...combined, reports: null }]) {
    assert.equal(gradeRun(run, fixture).passed, false);
  }
});

test('Independent grader leaves trace and trusted fixture unchanged', () => {
  const original = JSON.stringify({ combined, fixture });
  gradeRun(combined, fixture);
  assert.equal(JSON.stringify({ combined, fixture }), original);
});

test('Expiry at the prospective commit sequence is a correct denial', () => {
  const narrow = structuredClone(fixture);
  const normal = runScenario(narrow.visible, { condition: 'clean' });
  const commit = normal.events.find((event) => event.type === 'commit' && event.requestId === 'A-main');
  narrow.visible.grants.find((grant) => grant.id === 'specialist-A').expiresAt = commit.seq;
  const expired = runScenario(narrow.visible, { condition: 'clean' });
  const decision = expired.events.find((event) => event.type === 'decision' && event.stage === 'commit' && event.requestId === 'A-main');
  assert.equal(decision.allowed, false);
  assert.equal(decision.seq + 1, commit.seq);
  const judgement = gradeRun(expired, narrow);
  assert.ok(!judgement.violations.some((violation) => violation.code === 'FALSE_DENIAL'), JSON.stringify(judgement.violations));
  // The condition still fails task completion. Correct enforcement is not success on every dimension.
  assert.ok(judgement.violations.some((violation) => violation.code === 'JOB_COMPLETION'));
});

test('Commit event must immediately follow its final permission decision', () => {
  const run = structuredClone(combined);
  const index = run.events.findIndex((event) => event.type === 'commit');
  const event = run.events[index];
  // Move the unrelated observation between an existing decision/commit pair.
  const observation = run.events.find((item) => item.type === 'revocation-observed');
  run.events.splice(run.events.indexOf(observation), 1);
  run.events.splice(run.events.indexOf(event), 0, observation);
  run.events.forEach((item, i) => { item.seq = i + 1; });
  for (const item of run.queue) {
    item.attemptSeq = run.events.find((e) => e.type === 'attempt' && e.requestId === item.requestId).seq;
    item.commitSeq = run.events.find((e) => e.type === 'commit' && e.requestId === item.requestId).seq;
  }
  const judgement = gradeRun(run, fixture);
  assert.ok(judgement.violations.some((violation) => violation.code === 'COMMIT_ORDER'));
});
