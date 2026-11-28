import test from 'node:test';
import assert from 'node:assert/strict';
import { newestRun, firstRunAfter, recordState, relativeAge, runsInWindow, latestPriceRun, overdueHours, priceRunDetail, heldPriceChecks, appliedPriceChanges, newlyPricedModels, publishedRunCount, runStatusLabel } from '../../src/lib/pipeline-status.mjs';

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

test('a dated recovery receipt keeps the first later run when newer records arrive', () => {
  const first = { timestamp: '2026-11-10T08:49:45Z', bot: 'model_bot', items_published: 1 };
  const newer = { timestamp: '2026-11-26T15:39:25Z', bot: 'model_bot', items_published: 1 };
  const failed = { timestamp: '2026-11-10T08:00:00Z', bot: 'model_bot', items_published: 0 };
  assert.equal(firstRunAfter([newer, failed, first], '2026-11-09T23:59:59Z', (run) => run.items_published > 0), first);
  assert.equal(firstRunAfter([first], 'bad date'), null);
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

test('a partial price publication says what shipped and what was held', () => {
  const partial = { bot: 'model_bot', job: 'prices', status: 'partial', items_published: 1, items_rejected: 2 };
  assert.equal(priceRunDetail(partial), 'Snapshot published · 2 checks held for review');
  assert.equal(runStatusLabel(partial), 'published with review holds');
  assert.equal(recordState({ ...partial, timestamp: '2026-09-12T20:30:00Z' }, 36, now).label, 'Published with review holds');
  assert.equal(priceRunDetail({ ...partial, items_rejected: 1 }), 'Snapshot published · 1 check held for review');
  assert.equal(priceRunDetail({ ...partial, bot: 'thought_bot' }), '');
  assert.equal(priceRunDetail({ ...partial, items_rejected: 0 }), '');
  assert.equal(runStatusLabel({ ...partial, items_rejected: 0 }), 'partial');
  assert.equal(recordState({ status: 'partial', timestamp: '2026-09-12T20:30:00Z' }, 36, now).label, 'Last run partial');
});

test('held price details expose only complete review-needed comparisons', () => {
  const held = { id: 'example/held', status: 'review-needed', previous: { inputPrice: 1, outputPrice: 2 }, quoted: { inputPrice: 2, outputPrice: 4 } };
  assert.deepEqual(heldPriceChecks({ checks: [
    held,
    { ...held, id: 'example/verified', status: 'verified' },
    { ...held, id: '', status: 'review-needed' },
    { ...held, id: 'example/incomplete', quoted: { inputPrice: null, outputPrice: 4 } },
  ] }), [held]);
  assert.deepEqual(heldPriceChecks(null), []);
});

test('published price details expose only complete verified changes', () => {
  const changed = { id: 'example/changed', status: 'verified', previous: { inputPrice: 1, outputPrice: 2 }, applied: { inputPrice: 0.8, outputPrice: 1.6 } };
  assert.deepEqual(appliedPriceChanges({ checks: [
    changed,
    { ...changed, id: 'example/same', applied: changed.previous },
    { ...changed, id: 'example/held', status: 'review-needed' },
    { ...changed, id: '', status: 'verified' },
    { ...changed, id: 'example/incomplete', applied: { inputPrice: null, outputPrice: 1.6 } },
  ] }), [changed]);
  assert.deepEqual(appliedPriceChanges(null), []);
});

test('newly available prices require explicit earlier nulls and complete verified rates', () => {
  const listed = { id: 'example/new', status: 'verified', previous: { inputPrice: null, outputPrice: null }, applied: { inputPrice: 0.57, outputPrice: 2.3 } };
  assert.deepEqual(newlyPricedModels({ checks: [
    listed,
    { ...listed, id: 'example/changed', previous: { inputPrice: 1, outputPrice: 2 } },
    { ...listed, id: 'example/held', status: 'review-needed' },
    { ...listed, id: '', status: 'verified' },
    { ...listed, id: 'example/missing-before', previous: {} },
    { ...listed, id: 'example/incomplete', applied: { inputPrice: 0.57, outputPrice: null } },
  ] }), [listed]);
  assert.deepEqual(newlyPricedModels(null), []);
});

test('publication counts use recorded output rather than a broad status label', () => {
  assert.equal(publishedRunCount([
    { status: 'partial', items_published: 1 },
    { status: 'success', items_published: 2 },
    { status: 'success', items_published: 0 },
    { status: 'error' },
  ]), 2);
});
