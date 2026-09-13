import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clockHistory, clockMovement, scenarioClock, validateClockHistory, validateClockPayload } from '../../src/lib/horizon-clocks.mjs';
import { FUTURES, STANCES } from '../../src/lib/horizon-explorer.mjs';

const read = name => JSON.parse(readFileSync(new URL(`../../src/data/horizon/${name}.json`, import.meta.url)));
const data = { schema: 1, revision: 'a'.repeat(64), scenarios: read('scenarios'), review: read('outlook-review'), history: read('clock-history'), briefs: read('decision-briefs') };
const now = Date.parse('2026-09-13T12:34:56Z');
const record = (timeframe, definition = 'The same threshold') => ({ definition, timeframes: { pragmatic: timeframe } });

test('a clock counts to the opening year, accounting for leap days and UTC', () => {
  const clock = scenarioClock('2029–2031', Date.parse('2028-02-28T23:59:59Z'));
  assert.equal(clock.phase, 'opening');
  assert.equal(clock.target, Date.UTC(2029, 0, 1));
  assert.deepEqual([clock.days, clock.hours, clock.minutes, clock.seconds], [307, 0, 0, 1]);
  assert.equal(scenarioClock('2029–2031', Date.parse('2028-12-31T19:00:00-05:00')).phase, 'open');
});

test('inside a window the clock counts to the inclusive final year, then asks for review', () => {
  assert.equal(scenarioClock('2029–2031', Date.UTC(2029, 0, 1)).target, Date.UTC(2032, 0, 1));
  const last = scenarioClock('2029–2031', Date.parse('2031-12-31T23:59:59Z'));
  assert.equal(last.phase, 'open');
  assert.deepEqual([last.days, last.hours, last.minutes, last.seconds], [0, 0, 0, 1]);
  for (const time of [Date.UTC(2032, 0, 1), Date.UTC(2040, 0, 1)]) {
    const elapsed = scenarioClock('2029–2031', time);
    assert.equal(elapsed.phase, 'elapsed');
    assert.equal(elapsed.label, 'Window elapsed');
    assert.equal(elapsed.target, null);
    assert.equal(elapsed.days, undefined);
  }
});

test('by claims retain their deadline meaning and never expire at the start of their year', () => {
  for (const wording of ['by 2028', 'by end of 2028']) {
    assert.equal(scenarioClock(wording, Date.UTC(2028, 0, 1)).phase, 'deadline');
    assert.equal(scenarioClock(wording, now).target, Date.UTC(2029, 0, 1));
    assert.equal(scenarioClock(wording, Date.UTC(2029, 0, 1)).label, 'Deadline elapsed');
  }
});

test('a fractional last second remains visible; time passing cannot move the target', () => {
  const before = scenarioClock('2029–2031', Date.UTC(2029, 0, 1) - 100);
  assert.equal(before.seconds, 1);
  const first = scenarioClock('2029–2031', now), later = scenarioClock('2029–2031', now + 1000);
  const seconds = clock => clock.days * 86400 + clock.hours * 3600 + clock.minutes * 60 + clock.seconds;
  assert.equal(first.target, later.target);
  assert.equal(seconds(first) - seconds(later), 1);
});

test('all five sceptical views and invalid time inputs have no invented countdown', () => {
  for (const scenario of data.scenarios) {
    assert.equal(scenarioClock(scenario.sceptical.timeframe, now).phase, 'undated');
    assert.equal(scenarioClock(scenario.sceptical.timeframe, now).target, null);
  }
  assert.equal(scenarioClock('2030–2032', NaN).target, null);
  assert.equal(scenarioClock('not this generation', now).days, undefined);
});

test('revision labels distinguish date movement, widening, narrowing and changed thresholds', () => {
  const previous = record('2032–2035');
  for (const [wording, kind] of [['2032–2035', 'unchanged'], ['2030–2033', 'earlier'], ['2034–2037', 'later'], ['2031–2036', 'wider'], ['2033–2034', 'narrower'], ['not this generation', 'undated']]) assert.equal(clockMovement(previous, record(wording), 'pragmatic').kind, kind);
  assert.equal(clockMovement(record('by 2028'), record('by 2029'), 'pragmatic').kind, 'later');
  assert.equal(clockMovement(record('2032–2035'), record('2030–2032', 'A different threshold'), 'pragmatic').kind, 'scope');
  assert.equal(clockMovement(record('not this generation'), previous, 'pragmatic').kind, 'dated');
  assert.equal(clockMovement(undefined, previous, 'pragmatic').kind, 'baseline');
});

test('the published baseline and review validate without inventing a revision', () => {
  assert.deepEqual(validateClockPayload(data), []);
  // The preserved April to September comparison is unchanged in all 15 views.
  for (const future of FUTURES) for (const stance of STANCES) assert.equal(clockHistory(data.history.slice(0, 2), future.id, stance).at(-1).movement.kind, 'unchanged');
});

function reviseOne() {
  const next = structuredClone(data), id = FUTURES[1].id;
  const decision = structuredClone(clockHistory(next.history, id, 'pragmatic').at(-1).record);
  decision.timeframes.pragmatic = '2028–2030';
  decision.reason = 'Test fixture: a new independently assessed result supports an earlier window.';
  const date = next.review.reviewed_at; // multiple reviews on a single real day are allowed
  next.history.push({ id: 'test-new-review', kind: 'review', date, records: [decision] });
  next.scenarios.find(item => item.id === id).pragmatic.timeframe = decision.timeframes.pragmatic;
  Object.assign(next.review.futures.find(item => item.id === id), { timeframes: decision.timeframes, assessment: decision.reason });
  next.revision = 'b'.repeat(64);
  return next;
}

test('a partial evidence review moves only its future and retains everyone else’s review', () => {
  const next = reviseOne();
  assert.deepEqual(validateClockPayload(next, data.history), []);
  assert.equal(clockHistory(next.history, FUTURES[1].id, 'pragmatic').at(-1).movement.kind, 'earlier');
  assert.equal(clockHistory(next.history, FUTURES[0].id, 'pragmatic').length, data.history.length);
  assert.equal(scenarioClock(next.scenarios[1].pragmatic.timeframe, now).target, Date.UTC(2028, 0, 1));
});

test('published history cannot be rewritten, truncated or rolled back by an old cached response', () => {
  const altered = structuredClone(data);
  altered.history[1].records[0].reason += ' Rewritten.';
  assert.match(validateClockPayload(altered, data.history).join(' '), /append-only/);
  const next = reviseOne();
  assert.match(validateClockPayload(data, next.history).join(' '), /append-only/);
  assert.match(validateClockPayload({ ...data, history: data.history.slice(0, 1) }, data.history).join(' '), /baseline and an evidence review/);
});

test('changing a date, threshold, reason or source requires a matching evidence record', () => {
  for (const change of [
    value => { value.scenarios[0].pragmatic.timeframe = '2031–2033'; value.review.futures[0].timeframes.pragmatic = '2031–2033'; },
    value => { value.scenarios[0].definition += ' A changed threshold.'; },
    value => { value.review.futures[0].assessment += ' A new assessment.'; },
    value => { value.review.futures[0].evidence[0].limit = 'A different limitation.'; },
  ]) {
    const next = structuredClone(data); change(next);
    assert.ok(validateClockPayload(next).length > 0);
  }
});

test('future reviews, unsafe sources, reversed windows and malformed data fail safely', () => {
  for (const change of [
    value => { value.history[1].date = '9999-01-01'; },
    value => { value.history[1].records[0].evidence[0].url = 'javascript:alert(1)'; },
    value => { value.history[1].records[0].timeframes.pragmatic = '2035–2032'; },
    value => { value.history[1].records[0].evidence = 'broken'; },
    value => { value.briefs[0].moves = {}; },
    value => { value.history[1] = null; },
    value => { value.revision = 'unsupported'; },
  ]) {
    const next = structuredClone(data); change(next);
    assert.ok(validateClockPayload(next).length > 0);
  }
  assert.ok(validateClockPayload(null).length > 0);
  assert.ok(validateClockHistory([data.history[0], { ...data.history[1], records: [null] }], data.review, data.scenarios).length > 0);
});
