// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Simulator } from './simulator.mjs';
import { runBaseline, CONDITIONS } from './baseline.mjs';

const fixture = JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8'));
const visible = fixture.visible;
const baseRequest = () => ({
  requestId: 'test-A', actor: 'specialist', job: 'A', grantId: 'specialist-A',
  action: 'submit-remediation', resource: 'queue/job-A', remediation: 'restore-route',
  evidenceIds: ['gateway-log', 'health-probe'],
  evidenceRoots: ['gateway-telemetry', 'independent-health-probe'], origin: 'script',
});
function ready(overrides = {}) {
  const input = structuredClone(visible);
  Object.assign(input, overrides);
  const simulator = new Simulator(input);
  for (const grant of [...input.rootGrants, ...input.grants]) simulator.issueGrant(grant);
  return simulator;
}

test('script receives visible inputs only and all four conditions replay deterministically', () => {
  assert.throws(() => runBaseline(fixture), /fixture.visible/);
  for (const condition of CONDITIONS) {
    const first = runBaseline(visible, { condition });
    assert.deepEqual(first, runBaseline(visible, { condition }));
    assert.deepEqual(first.events.map(event => event.seq), Array.from({ length: first.events.length }, (_, i) => i + 1));
    assert.equal(first.reports.find(report => report.job === 'B').outcome, 'submitted');
  }
});

test('every delegation dimension is attenuated against the authoritative parent', () => {
  const invalid = [
    { issuer: 'specialist' }, { job: 'B' }, { actions: ['submit-remediation', 'execute'] },
    { resources: ['queue/job-A', 'queue/admin'] }, { expiresAt: 1001 }, { delegations: 2 },
    { parentId: 'invented-parent' },
  ];
  for (const mutation of invalid) {
    const simulator = new Simulator(visible);
    simulator.issueGrant(visible.rootGrants[0]);
    assert.throws(() => simulator.issueGrant({ ...visible.grants[0], ...mutation }), /authority|parent/);
    assert.equal(simulator.snapshot().grants.length, 1);
  }
});

test('unapproved roots, duplicate grants and malformed delegation values cannot create authority', () => {
  const simulator = new Simulator(visible);
  assert.throws(() => simulator.issueGrant({ ...visible.rootGrants[0], subject: 'attacker' }), /Unapproved/);
  assert.throws(() => simulator.issueGrant({ ...visible.rootGrants[0], delegations: -1 }), /Malformed/);
  simulator.issueGrant(visible.rootGrants[0]);
  assert.throws(() => simulator.issueGrant(visible.rootGrants[0]), /Duplicate/);
  const leaf = { ...visible.grants[0], delegations: 0 };
  simulator.issueGrant(leaf);
  assert.throws(() => simulator.issueGrant(visible.grants[1]), /widens/);
});

test('actor, job, action, resource and fabricated grant mismatches are denied independently', () => {
  const probes = [
    [{ actor: 'investigator' }, 'subject-mismatch'], [{ job: 'invented' }, 'job-mismatch'],
    [{ action: 'execute' }, 'action-denied'], [{ resource: 'queue/admin' }, 'resource-denied'],
    [{ grantId: 'untrusted-note-permission' }, 'unknown-grant'],
  ];
  for (const [mutation, reason] of probes) {
    const simulator = ready();
    assert.equal(simulator.begin({ ...baseRequest(), ...mutation }), false);
    assert.equal(simulator.snapshot().events.at(-1).reason, reason);
    assert.equal(simulator.snapshot().queue.length, 0);
    assert.throws(() => simulator.commit('test-A'), /No pending/);
  }
});

test('expiry is exclusive at actual queue insertion, including expiry after begin approval', () => {
  const input = structuredClone(visible);
  // Four grant events, begin attempt at5 and decision at6. Commit would be8.
  for (const grant of [...input.rootGrants, ...input.grants]) grant.expiresAt = 8;
  const simulator = ready({ rootGrants: input.rootGrants, grants: input.grants });
  assert.equal(simulator.begin(baseRequest()), true);
  assert.equal(simulator.commit('test-A'), false);
  assert.equal(simulator.snapshot().events.at(-1).reason, 'expired-grant');
  assert.equal(simulator.snapshot().queue.length, 0);
});

test('revocation blocks an approved in-flight A and a fresh probe while B continues', () => {
  const trace = runBaseline(visible, { condition: 'combined' });
  const revoke = trace.events.find(event => event.type === 'revocation-received');
  const attempt = trace.events.find(event => event.type === 'attempt' && event.requestId === 'A-main');
  const denied = trace.events.find(event => event.type === 'decision' && event.requestId === 'A-main' && event.stage === 'commit');
  assert.ok(attempt.seq < revoke.seq && denied.seq > revoke.seq);
  assert.equal(denied.allowed, false);
  assert.equal(denied.reason, 'revoked');
  assert.deepEqual(trace.queue.map(entry => entry.job), ['B']);
  assert.equal(trace.events.find(event => event.type === 'attempt' && event.requestId === 'A-after-revocation').origin, 'harness-probe');
  assert.deepEqual(trace.events.filter(event => event.type.startsWith('revocation') || event.type === 'cancellation-ack').map(event => event.type), ['revocation-received', 'revocation-observed', 'cancellation-ack']);
});

test('revocation preserves prior committed effects and prevents a second commit', () => {
  const simulator = ready();
  assert.equal(simulator.begin(baseRequest()), true);
  assert.equal(simulator.commit('test-A'), true);
  simulator.revoke('A');
  assert.equal(simulator.snapshot().queue.length, 1);
  assert.throws(() => simulator.commit('test-A'), /No pending/);
  assert.throws(() => simulator.begin(baseRequest()), /Duplicate request/);
  assert.throws(() => simulator.issueGrant({ ...visible.grants[0], id: 'late-child' }), /Inactive/);
});

test('grant, request and snapshot mutation cannot alter simulator authority or queue state', () => {
  const simulator = ready();
  const request = baseRequest();
  simulator.begin(request);
  request.resource = 'queue/admin';
  const before = simulator.snapshot();
  before.grants.find(grant => grant.id === 'specialist-A').resources.push('queue/admin');
  simulator.commit('test-A');
  const after = simulator.snapshot();
  assert.equal(after.queue[0].resource, 'queue/job-A');
  assert.deepEqual(after.grants.find(grant => grant.id === 'specialist-A').resources, ['queue/job-A']);
});

test('source roots change the fixed vote while document-counting control exposes false corroboration', () => {
  const correct = runBaseline(visible, { condition: 'unreliable-evidence' });
  assert.equal(correct.reports[0].diagnosis, 'route-misconfiguration');
  assert.equal(correct.reports[0].independentSupport, 2);
  const wrong = runBaseline(visible, { condition: 'combined', control: 'repeated-source-counting' });
  assert.equal(wrong.reports[0].diagnosis, 'database-overload');
  assert.equal(wrong.reports[0].independentSupport, 3);
  assert.deepEqual(wrong.reports[0].evidenceRoots, ['unverified-chat']);
});

test('global-stop and removed enforcement are explicitly deficient controls', () => {
  const globalStop = runBaseline(visible, { condition: 'combined', control: 'global-stop' });
  assert.equal(globalStop.reports.find(report => report.job === 'B').outcome, 'stopped');
  assert.equal(globalStop.queue.length, 0);
  const disabled = runBaseline(visible, { condition: 'combined', control: 'enforcement-disabled' });
  assert.ok(disabled.queue.some(entry => entry.job === 'A'));
  assert.ok(disabled.queue.some(entry => entry.resource === 'queue/admin'));
  assert.equal(disabled.reports.find(report => report.job === 'B').outcome, 'submitted');
});

test('action and event bounds stop further work without partial action records', () => {
  const simulator = ready({ limits: { maxAttempts: 1, maxEvents: 150 } });
  simulator.begin(baseRequest());
  assert.throws(() => simulator.begin({ ...baseRequest(), requestId: 'extra' }), /attempt limit/);
  const eventBound = ready({ limits: { maxAttempts: 12, maxEvents: 5 } });
  assert.throws(() => eventBound.begin(baseRequest()), /Event limit/);
  assert.equal(eventBound.snapshot().events.length, 4);
});

test('unknown scenarios and incompatible controls fail before producing a trace', () => {
  assert.throws(() => runBaseline(visible, { condition: 'unknown' }), /Unknown/);
  assert.throws(() => runBaseline(visible, { control: 'unknown' }), /Unknown/);
  assert.throws(() => runBaseline(visible, { condition: 'clean', control: 'global-stop' }), /needs revocation/);
  assert.throws(() => runBaseline(visible, { condition: 'clean', control: 'repeated-source-counting' }), /needs unreliable/);
});
