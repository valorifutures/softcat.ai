import test from 'node:test';
import assert from 'node:assert/strict';
import {
  latestPredictions, predictionHistory, predictionMovement, predictionClock,
  predictionCaption, predictionTargetLabel, predictionBriefing, validatePredictionHistory, validatePredictionPayload,
} from '../../src/lib/horizon-predictions.mjs';
import { FUTURES } from '../../src/lib/horizon-explorer.mjs';

const today = '2026-09-15';
const initial = [{
  id: 'fixture-first-predictions', date: today, reason: 'Test fixture initial editorial predictions.',
  records: FUTURES.map((future, index) => ({
    id: future.id, title: `Fixture ${future.key}`, milestone: `A measurable fixture milestone for ${future.key}.`,
    target_date: `${2028 + index}-12-31`, resolution: [`Observable criterion for ${future.key}.`, 'Independent confirmation.'],
    rationale: `Fixture assessment for ${future.key}.`, uncertainty: `Fixture uncertainty for ${future.key}.`,
    earlier: `Earlier signal for ${future.key}.`, later: `Later signal for ${future.key}.`,
    evidence: [{ title: 'Fixture source', url: 'https://example.org/research', date_label: 'Test fixture', finding: 'A fixture finding.', limit: 'Not real forecast evidence.' }],
  })),
}];
const payload = history => ({ schema: 1, revision: 'a'.repeat(64), history });
const errors = history => validatePredictionHistory(history, today);
const agentId = FUTURES[1].id;
const brief = { id: agentId, question: 'Fixture CEO question?', moves: { pragmatic: 'Fixture next 90 days.' }, measure: 'Fixture outcome measure.' };
function revisedHistory() {
  const history = structuredClone(initial);
  const record = structuredClone(history[0].records[1]);
  record.target_date = '2028-12-31';
  record.rationale = 'Additional fixture evidence supports an earlier prediction.';
  history.push({ id: 'fixture-second-review', date: today, reason: 'A partial evidence review.', records: [record] });
  return history;
}

test('our deadline counts through the full prediction year in UTC, including leap days', () => {
  const record = initial[0].records[0];
  const beforeLeapDay = predictionClock(record, Date.parse('2028-02-28T23:59:59Z'));
  assert.equal(beforeLeapDay.phase, 'deadline');
  assert.equal(beforeLeapDay.label, 'Our prediction deadline in');
  assert.equal(beforeLeapDay.target, Date.UTC(2029, 0, 1));
  assert.deepEqual([beforeLeapDay.days, beforeLeapDay.hours, beforeLeapDay.minutes, beforeLeapDay.seconds], [307, 0, 0, 1]);
  assert.equal(predictionClock(record, Date.UTC(2028, 0, 1)).phase, 'deadline');
  const last = predictionClock(record, Date.parse('2028-12-31T23:59:59Z'));
  assert.equal(last.seconds, 1);
  assert.equal(predictionClock(record, Date.parse('2028-12-31T19:00:00-05:00')).phase, 'elapsed');
  assert.equal(predictionClock(record, Date.UTC(2029, 0, 1)).target, null);
});

test('time passing changes remaining days but cannot change our forecast target', () => {
  const record = initial[0].records[0], now = Date.parse(`${today}T12:00:00Z`);
  const first = predictionClock(record, now), later = predictionClock(record, now + 86400000);
  assert.equal(first.target, later.target);
  assert.equal(first.days - later.days, 1);
  assert.equal(predictionClock(record, NaN).target, null);
  for (const target_date of ['2028-02-30', '2029-02-29', '2028-04-31', '2028-12-32', '2028-00-12', '2028-1-01', '2028-05-07T00:00:00Z', '', 'not dated', '0099-12-31']) {
    assert.equal(predictionClock({ ...record, target_date }, now).target, null);
    assert.equal(predictionTargetLabel({ ...record, target_date }), 'No prediction date');
  }
  assert.equal(predictionTargetLabel(null), 'No prediction date');
  assert.equal(predictionClock(null, now).target, null);
});

test('a reviewed date counts through its own full UTC day without snapping to year end', () => {
  const record = { ...initial[0].records[0], target_date: '2028-05-07' };
  const boundary = Date.parse('2028-05-08T00:00:00Z');
  assert.equal(predictionTargetLabel(record), 'By 7 May 2028');
  assert.equal(predictionTargetLabel(initial[0].records[0]), 'By end of 2028');
  const first = predictionClock(record, boundary - 86400000);
  assert.equal(first.target, boundary);
  assert.equal(first.days, 1);
  const last = predictionClock(record, boundary - 1);
  assert.equal(last.target, boundary);
  assert.equal(last.days, 0);
  assert.equal(predictionCaption(last).summary, 'Less than 1 day until our prediction deadline');
  assert.equal(predictionClock(record, boundary).phase, 'elapsed');
  assert.equal(predictionClock(record, Date.parse('2028-05-07T20:00:00-04:00')).phase, 'elapsed');

  const leapDay = { ...record, target_date: '2028-02-29' };
  assert.equal(predictionClock(leapDay, Date.parse('2028-02-28T00:00:00Z')).days, 2);
  assert.equal(predictionClock(leapDay, Date.parse('2028-02-29T12:00:00Z')).target, Date.parse('2028-03-01T00:00:00Z'));
  assert.equal(predictionClock(leapDay, Date.parse('2028-03-01T00:00:00Z')).target, null);
});

test('the day count decreases immediately after midnight without rounding up a partial day', () => {
  const record = { ...initial[0].records[0], target_date: '2028-05-07' };
  const midnight = Date.parse('2028-05-06T00:00:00Z');
  assert.equal(predictionClock(record, midnight).days, 2);
  assert.equal(predictionClock(record, midnight + 1).days, 1);
  const lastMidnight = midnight + 86400000;
  assert.equal(predictionClock(record, lastMidnight).days, 1);
  assert.equal(predictionClock(record, lastMidnight + 1).days, 0);
  assert.equal(predictionCaption(predictionClock(record, lastMidnight + 1)).summary, 'Less than 1 day until our prediction deadline');
});

test('prediction captions distinguish a deadline from a window and an elapsed forecast', () => {
  const record = initial[0].records[0], boundary = Date.UTC(2029, 0, 1);
  assert.equal(predictionCaption(predictionClock(record, boundary - 86400000)).summary, '1 day until our prediction deadline');
  assert.equal(predictionCaption(predictionClock(record, boundary - 1)).summary, 'Less than 1 day until our prediction deadline');
  assert.equal(predictionCaption(predictionClock(record, boundary)).summary, 'Review due. Prediction deadline elapsed');
});

test('first publication needs exactly five predictions and current records retain future order', () => {
  assert.deepEqual(validatePredictionPayload(payload(initial), [], today), []);
  const reversed = structuredClone(initial);
  reversed[0].records.reverse();
  assert.deepEqual(latestPredictions(reversed).map(record => record.id), FUTURES.map(future => future.id));
  for (const records of [initial[0].records.slice(1), [...initial[0].records, initial[0].records[0]]]) assert.ok(errors([{ ...initial[0], records }]).length);
});

test('partial reviews update only the selected prediction and retain earlier snapshots', () => {
  const updated = revisedHistory();
  updated[0].date = '2026-09-14';
  const latest = latestPredictions(updated);
  assert.equal(latest[1].target_date, '2028-12-31');
  assert.equal(latest[1].reviewed_at, today);
  assert.equal(latest[0].reviewed_at, '2026-09-14');
  assert.equal(latest[1].event_reason, 'A partial evidence review.');
  assert.deepEqual(errors(updated), []);
  const snapshots = predictionHistory(updated, agentId);
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[0].record.target_date, '2029-12-31');
  assert.equal(snapshots[1].previous.target_date, '2029-12-31');
  assert.equal(snapshots[1].movement.kind, 'earlier');
  assert.equal(predictionHistory(updated, FUTURES[0].id).length, 1);
});

test('a 37-day evidence revision recalculates only its future and remains separate from elapsed days', () => {
  const history = structuredClone(initial);
  const revised = { ...structuredClone(initial[0].records[1]), target_date: '2029-11-24', rationale: 'Fixture evidence justifies a 37-day earlier date.' };
  history.push({ id: 'fixture-day-review', date: '2026-09-16', reason: 'A justified day-level fixture revision.', records: [revised] });
  assert.deepEqual(validatePredictionPayload(payload(history), initial, '2026-09-16'), []);
  const before = latestPredictions(initial), after = latestPredictions(history);
  const now = Date.parse('2026-09-16T12:00:00Z');
  for (const [index, record] of after.entries()) {
    const previous = predictionClock(before[index], now), current = predictionClock(record, now);
    assert.equal(previous.days - current.days, index === 1 ? 37 : 0);
    assert.equal(previous.target - current.target, index === 1 ? 37 * 86400000 : 0);
  }
  assert.deepEqual(history[0], initial[0]);
  assert.equal(after[1].reviewed_at, '2026-09-16');
  assert.equal(after[0].reviewed_at, today);
  const movement = predictionHistory(history, agentId).at(-1).movement;
  assert.deepEqual(movement, { kind: 'earlier', label: '37 days earlier', deltaDays: -37, dateChangeLabel: '37 days earlier' });
  const oldSnapshot = predictionClock(before[1], now - 86400000);
  const newSnapshot = predictionClock(after[1], now);
  assert.equal(oldSnapshot.days - newSnapshot.days, 38);
  assert.equal(movement.deltaDays, -37);
  assert.match(validatePredictionPayload(payload(initial), history, '2026-09-16').join(' '), /append-only/);
});

test('movement labels separate changed dates from changed milestone or success criteria', () => {
  const previous = initial[0].records[0];
  assert.deepEqual(predictionMovement(undefined, previous), { kind: 'baseline', label: 'Initial estimate', deltaDays: null, dateChangeLabel: null });
  assert.deepEqual(predictionMovement(previous, { ...previous, rationale: 'New supporting evidence.' }), { kind: 'unchanged', label: 'No days added or removed', deltaDays: 0, dateChangeLabel: null });
  assert.deepEqual(predictionMovement(previous, { ...previous, target_date: '2027-12-31' }), { kind: 'earlier', label: '366 days earlier', deltaDays: -366, dateChangeLabel: '366 days earlier' });
  assert.deepEqual(predictionMovement(previous, { ...previous, target_date: '2029-12-31' }), { kind: 'later', label: '365 days later', deltaDays: 365, dateChangeLabel: '365 days later' });
  assert.equal(predictionMovement(previous, { ...previous, milestone: 'A different threshold.' }).kind, 'scope');
  assert.equal(predictionMovement(previous, { ...previous, resolution: ['A weaker criterion.'] }).kind, 'scope');
  assert.deepEqual(predictionMovement(previous, { ...previous, target_date: '2029-01-01', milestone: 'A different threshold.' }), { kind: 'scope', label: 'Milestone changed', deltaDays: 1, dateChangeLabel: '1 day later' });
  assert.equal(predictionMovement(previous, { ...previous, target_date: '2028-12-30' }).label, '1 day earlier');
  assert.deepEqual(predictionMovement(previous, { ...previous, target_date: '2028-02-30' }), { kind: 'undated', label: 'Date comparison unavailable', deltaDays: null, dateChangeLabel: null });
});

test('published history rejects rewrites, reordering and a cached older payload', () => {
  const updated = revisedHistory();
  assert.deepEqual(validatePredictionPayload(payload(updated), initial, today), []);
  assert.match(validatePredictionPayload(payload(initial), updated, today).join(' '), /append-only/);
  for (const change of [
    value => { value[0].records[0].rationale = 'Rewritten opinion.'; },
    value => { value[0].records[0].evidence[0].limit = 'Rewritten limit.'; },
    value => { value[0].records.reverse(); },
    value => { value.reverse(); },
  ]) {
    const history = structuredClone(updated); change(history);
    assert.match(validatePredictionPayload(payload(history), updated, today).join(' '), /append-only/);
  }
});

test('malformed records, invalid calendar dates and unsafe source URLs fail validation', () => {
  for (const change of [
    value => { value[0] = null; },
    value => { value[0].date = '2026-09-16'; },
    value => { value[0].date = '2026-02-30'; },
    value => { value[0].reason = ''; },
    value => { value[0].records = {}; },
    value => { value[0].records[0] = null; },
    value => { value[0].records[0].id = 'unknown-future'; },
    value => { value[0].records[0].target_date = '2028-02-30'; },
    value => { value[0].records[0].target_date = '2029-02-29'; },
    value => { value[0].records[0].target_date = '2028-12-32'; },
    value => { value[0].records[0].resolution = ['']; },
    value => { value[0].records[0].milestone = 12; },
    value => { value[0].records[0].uncertainty = ''; },
    value => { value[0].records[0].evidence = []; },
    value => { value[0].records[0].evidence = 'broken'; },
    value => { value[0].records[0].evidence[0].url = 'javascript:alert(1)'; },
    value => { value[0].records[0].evidence[0].url = 'https://user:password@example.org/'; },
    value => { value[0].records[0].evidence[0].finding = ''; },
  ]) {
    const history = structuredClone(initial); change(history);
    assert.ok(errors(history).length > 0);
  }
  for (const value of [null, [], {}, { ...payload(initial), revision: 'old' }, { ...payload(initial), schema: 2 }, payload('broken')]) assert.ok(validatePredictionPayload(value, [], today).length > 0);
});

test('duplicate event IDs and out-of-order review dates are invalid', () => {
  const duplicate = revisedHistory(); duplicate[1].id = duplicate[0].id;
  assert.match(errors(duplicate).join(' '), /duplicate event ID/);
  const backwards = revisedHistory(); backwards[1].date = '2026-09-14';
  assert.match(errors(backwards).join(' '), /out-of-order review date/);
});

test('copyable brief carries our prediction, its test, decision guidance and evidence limits', () => {
  const history = revisedHistory(), record = history[1].records[0];
  const text = predictionBriefing(history, agentId, brief);
  for (const field of ['milestone', 'target_date', 'rationale', 'uncertainty', 'earlier', 'later']) assert.ok(text.includes(record[field]), field);
  for (const criterion of record.resolution) assert.ok(text.includes(criterion));
  for (const field of ['title', 'url', 'date_label', 'finding', 'limit']) assert.ok(text.includes(record.evidence[0][field]), field);
  assert.ok(text.includes(brief.question));
  assert.ok(text.includes(brief.moves.pragmatic));
  assert.ok(text.includes(brief.measure));
  assert.match(text, /by the end of 2028/);
  assert.match(text, /https:\/\/softcat\.ai\/horizon\/\?future=agents$/);
  assert.doesNotMatch(text, /view=|scenario’s window/);
  assert.equal(predictionBriefing(history, 'javascript:alert(1)', brief), text);
  assert.throws(() => predictionBriefing(history, FUTURES[0].id, brief), /matching decision brief/);
});

test('copyable brief retains a reviewed exact date and an optional dated day-count snapshot', () => {
  const history = revisedHistory();
  history[1].records[0].target_date = '2028-05-07';
  const now = Date.parse('2028-05-05T12:00:00Z');
  const text = predictionBriefing(history, agentId, brief, now);
  assert.match(text, /by 7 May 2028/);
  assert.match(text, /Prediction deadline: 2028-05-07 \(inclusive, UTC\)/);
  assert.match(text, /Countdown snapshot, 2028-05-05T12:00:00\.000Z \(UTC\)/);
  assert.match(text, /2 days until our prediction deadline/);
  assert.match(text, /not a guarantee or a prediction of an exact arrival day/);
  assert.doesNotMatch(text, /end of 2028|end of year/);
  assert.doesNotMatch(predictionBriefing(history, agentId, brief), /Countdown snapshot/);
  assert.doesNotMatch(predictionBriefing(history, agentId, brief, NaN), /Countdown snapshot/);
  assert.match(predictionBriefing(history, agentId, brief, Date.parse('2028-05-08T00:00:00Z')), /Review due\. Prediction deadline elapsed/);
});
