import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FUTURES, STANCES } from '../../src/lib/horizon-explorer.mjs';
import { EDUCATION_PRAGMATIC_SCOPE, horizonBriefing } from '../../src/lib/horizon-briefing.mjs';

const readData = name => JSON.parse(readFileSync(new URL(`../../src/data/horizon/${name}.json`, import.meta.url)));
const data = { scenarios: readData('scenarios'), review: readData('outlook-review'), briefs: readData('decision-briefs'), history: readData('clock-history') };

test('all fifteen briefings preserve their selected claim, action and complete source limitations', () => {
  for (const { key: future, id } of FUTURES) for (const view of STANCES) {
    const text = horizonBriefing(data, { future, view });
    const scenario = data.scenarios.find(item => item.id === id);
    const record = data.review.futures.find(item => item.id === id);
    const brief = data.briefs.find(item => item.id === id);
    for (const value of [record.title, scenario.definition, scenario[view].assumptions, scenario[view].blockers, scenario[view].implication, brief.question, brief.moves[view], brief.measure, record.assessment, record.watch]) assert.ok(text.includes(value));
    assert.ok(text.includes(`Scenario date wording: ${scenario[view].timeframe}\n`));
    assert.ok(text.includes('Illustrative editorial scenarios, not calibrated probabilities.'));
    assert.ok(text.includes('It does not predict an exact arrival date.'));
    assert.ok(text.includes(`https://softcat.ai/horizon/?future=${future}&view=${view}`));
    for (const source of record.evidence) for (const value of [source.title, source.url, source.date_label, source.finding, source.limit]) assert.ok(text.includes(value));
    for (const otherView of STANCES.filter(item => item !== view)) assert.ok(!text.includes(brief.moves[otherView]));
    assert.equal(text.includes(EDUCATION_PRAGMATIC_SCOPE), future === 'education' && view === 'pragmatic');
  }
});

test('a partial review does not give untouched futures a newer review date', () => {
  const updated = structuredClone(data);
  const id = FUTURES[0].id;
  const record = updated.history.at(-1).records.find(item => item.id === id);
  updated.history.push({ id: 'test-partial-review', kind: 'review', date: '2026-09-15', records: [record] });
  updated.review.reviewed_at = '2026-09-15';
  assert.ok(horizonBriefing(updated, { future: 'agi', view: 'pragmatic' }).includes('Sources reviewed: 2026-09-15'));
  assert.ok(horizonBriefing(updated, { future: 'agents', view: 'pragmatic' }).includes('Sources reviewed: 2026-09-13'));
});

test('legacy representative years cannot add precision to an open-ended exported claim', () => {
  const changed = structuredClone(data);
  for (const scenario of changed.scenarios) for (const view of STANCES) scenario[view].year = 2099;
  for (const { key: future } of FUTURES) assert.equal(horizonBriefing(changed, { future, view: 'sceptical' }), horizonBriefing(data, { future, view: 'sceptical' }));
});
