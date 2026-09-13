import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FUTURES, STANCES, horizonSearch, markPosition, parseTimeframe, readHorizonState, timelineDomain, validateOutlookReview } from '../../src/lib/horizon-explorer.mjs';

const scenarios = JSON.parse(readFileSync(new URL('../../src/data/horizon/scenarios.json', import.meta.url)));
const review = JSON.parse(readFileSync(new URL('../../src/data/horizon/outlook-review.json', import.meta.url)));

test('explicit windows and by-dates retain their different meanings', () => {
  assert.deepEqual(parseTimeframe('2032–2035'), { kind: 'range', start: 2032, end: 2035, label: '2032–2035' });
  assert.deepEqual(parseTimeframe('2032-2035'), { kind: 'range', start: 2032, end: 2035, label: '2032–2035' });
  assert.deepEqual(parseTimeframe('by end of 2028'), { kind: 'by', start: 2028, end: 2028, label: 'by end of 2028' });
  assert.equal(parseTimeframe('by 2030').kind, 'by');
});

test('vague and invalid dates never become precise timeline points', () => {
  for (const label of ['not before the 2040s', 'mid-2030s or later', 'not this generation', '2035-2032', '2030', 'around 2030']) {
    const mark = parseTimeframe(label);
    assert.deepEqual(mark, { kind: 'open', label });
    assert.equal(markPosition(mark, { start: 2026, end: 2038 }), null);
  }
  assert.equal(parseTimeframe(null).label, 'No dated window');
});

test('all published stances fit an evenly spaced domain without using legacy representative years', () => {
  const domain = timelineDomain(scenarios, 2026);
  assert.equal(domain.start, 2026);
  assert.equal(domain.ticks[1] - domain.ticks[0], domain.ticks[2] - domain.ticks[1]);
  assert.equal(domain.ticks[2] - domain.ticks[1], domain.ticks[3] - domain.ticks[2]);
  for (const scenario of scenarios) {
    for (const stance of STANCES) {
      const mark = parseTimeframe(scenario[stance].timeframe);
      const position = markPosition(mark, domain);
      if (stance === 'sceptical') assert.equal(position, null);
      if (position) {
        assert.ok(position.left >= 0);
        assert.ok(position.width >= 0);
        assert.ok(position.left + position.width <= 100);
      }
    }
  }
  const altered = structuredClone(scenarios);
  altered.forEach(scenario => STANCES.forEach(stance => { scenario[stance].year = 2099; }));
  assert.deepEqual(timelineDomain(altered, 2026), domain);
});

test('bookmarks round-trip every future and stance and keep unrelated parameters', () => {
  for (const { key: future } of FUTURES) {
    for (const view of STANCES) {
      const state = { future, view };
      const query = horizonSearch('?utm_source=notebook&view=unknown', state);
      assert.deepEqual(readHorizonState(query), state);
      assert.equal(new URLSearchParams(query).get('utm_source'), 'notebook');
    }
  }
});

test('malformed and unknown bookmark values fall back safely', () => {
  const defaults = { future: 'agents', view: 'pragmatic' };
  for (const query of ['', '?future=__proto__&view=constructor', '?future=%E0%A4%A&view=Optimistic', '?future=<script>&view=']) {
    assert.deepEqual(readHorizonState(query), defaults);
  }
  assert.deepEqual(readHorizonState('?future=agi&view=unknown'), { future: 'agi', view: 'pragmatic' });
  assert.deepEqual(readHorizonState(horizonSearch('', { future: 'missing', view: 'unknown' })), defaults);
});

test('the evidence gate accepts the reviewed outlook and catches unreviewed date changes', () => {
  assert.deepEqual(validateOutlookReview(review, scenarios, '2026-09-13'), []);
  const changed = structuredClone(scenarios);
  changed[0].pragmatic.timeframe = '2027–2028';
  assert.ok(validateOutlookReview(review, changed, '2026-09-13').some(error => error.includes('date changed')));
});

test('the evidence gate rejects invalid dates, unsafe sources and incomplete records', () => {
  for (const mutate of [
    r => { r.reviewed_at = '2026-09-14'; },
    r => { r.reviewed_at = '2026-02-30'; },
    r => { r.dates_origin = '2026-10-01'; },
    r => { r.decision = ''; },
    r => { r.futures.pop(); },
    r => { r.futures[1] = r.futures[0]; },
    r => { r.futures[0].evidence = []; },
    r => { r.futures[0].evidence[0].url = 'javascript:alert(1)'; },
    r => { r.futures[0].evidence[0].url = 'https://user:secret@example.org'; },
    r => { r.futures[0].evidence[0].limit = ''; },
  ]) {
    const changed = structuredClone(review);
    mutate(changed);
    assert.ok(validateOutlookReview(changed, scenarios, '2026-09-13').length > 0);
  }
});
