import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { matchingPredictionGuide, shortMovement } from '../../src/lib/horizon-reader.mjs';
import { latestPredictions, predictionMovement } from '../../src/lib/horizon-predictions.mjs';
const read = name => JSON.parse(readFileSync(new URL(`../../src/data/horizon/${name}.json`, import.meta.url), 'utf8'));
const guides = read('reader-guides');
const records = latestPredictions(read('prediction-history'));

test('each published prediction has a guide tied to its complete scope', () => {
  assert.equal(guides.length, 5);
  assert.equal(new Set(guides.map(item => item.id)).size, 5);
  for (const record of records) {
    const guide = matchingPredictionGuide(record, guides);
    assert.ok(guide, record.id);
    assert.equal(guide.id, record.id);
    assert.equal(guide.checks.length, 3);
  }
});

test('changed dates and evidence do not remove a still-valid scope summary', () => {
  for (const record of records) {
    const revised = { ...record, target_date: '2035-06-12', rationale: 'A new assessment.', reviewed_at: '2030-01-01', evidence: [] };
    assert.equal(matchingPredictionGuide(revised, guides), matchingPredictionGuide(record, guides));
  }
});

test('a changed claim, weakened test or added condition cannot retain an old summary', () => {
  for (const record of records) {
    for (const changed of [
      { ...record, milestone: 'A different milestone.' },
      { ...record, resolution: record.resolution.slice(1) },
      { ...record, resolution: [...record.resolution, 'An extra required condition.'] },
      { ...record, resolution: record.resolution.map((text, i) => i === 0 ? `${text} Changed requirement.` : text) },
    ]) assert.equal(matchingPredictionGuide(changed, guides), null);
  }
  assert.equal(matchingPredictionGuide({ id: 'unknown' }, guides), null);
  assert.equal(matchingPredictionGuide(null, guides), null);
});

test('short review labels preserve date direction and scope changes', () => {
  const record = records[0];
  assert.equal(shortMovement(predictionMovement(record, record)), 'Date unchanged');
  assert.equal(shortMovement(predictionMovement(record, { ...record, target_date: '2031-12-30' })), '1 day earlier');
  assert.equal(shortMovement(predictionMovement(record, { ...record, target_date: '2032-01-01' })), '1 day later');
  assert.equal(shortMovement(predictionMovement(record, { ...record, milestone: 'Changed.' })), 'Milestone changed');
  assert.equal(shortMovement(predictionMovement(undefined, record)), 'Initial estimate');
});
