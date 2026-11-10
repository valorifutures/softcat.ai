import test from 'node:test';
import assert from 'node:assert/strict';
import { newestRun, recordState, relativeAge, runsInWindow, latestPriceRun, overdueHours } from '../../src/lib/pipeline-status.mjs';

const now = Date.parse('2026-09-12T21:00:00Z');
const old = { timestamp: '2026-07-03T08:30:48.697123+00:00', status: 'success' };

test('a July success cannot appear operational in September', () => {
  assert.equal(recordState(old, 36, now).label, 'No recent run recorded');
  assert.equal(relativeAge(old.timestamp, now), '71d ago');
});

test('newest record is selected by instant, regardless of input order or offset', () => {
  const later = { timestamp: '2026-09-12T20:30:00Z' };
  const earlier = { timestamp: '2026-09-12T21:00:00+01:00' };
  assert.equal(newestRun([later, earlier, { timestamp: 'bad' }]), later);
});

test('missing and future timestamps never look recent or successful', () => {
  assert.equal(recordState(null, 36, now).tone, 'muted');
  assert.equal(recordState({ timestamp: 'bad', status: 'success' }, 36, now).tone, 'muted');
  assert.equal(recordState({ timestamp: '2027-01-01', status: 'success' }, 36, now).label, 'Check timestamp');
  assert.equal(relativeAge('2027-01-01', now), 'Future timestamp');
});

test('weekly jobs have a longer grace period and errors remain explicit', () => {
  const threeDaysOld = { timestamp: '2026-09-09T21:00:00Z', status: 'success' };
  assert.equal(overdueHours('0 10 * * 0'), 240);
  assert.equal(recordState(threeDaysOld, overdueHours('0 10 * * 0'), now).tone, 'green');
  assert.equal(recordState(threeDaysOld, overdueHours('0 7 * * *'), now).tone, 'amber');
  assert.equal(recordState({ ...old, status: 'error' }, 36, now).label, 'Last run failed');
});

test('dated weekly summaries exclude invalid, old and future records', () => {
  const boundary = { timestamp: '2026-09-05T21:00:00Z' };
  const current = { timestamp: '2026-09-12T21:00:00Z' };
  assert.deepEqual(runsInWindow([old, boundary, current, { timestamp: '2026-09-12T21:00:01Z' }, { timestamp: 'bad' }], now), [boundary, current]);
});

test('a successful roster proposal cannot refresh the pricing timestamp', () => {
  const prices = { ...old, bot: 'model_bot', job: 'prices' };
  const roster = { timestamp: '2026-09-12T20:30:00Z', bot: 'model_bot', job: 'roster', status: 'success' };
  assert.equal(latestPriceRun([roster, prices]), prices);
  assert.equal(latestPriceRun([roster]), null);
});
