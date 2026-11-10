import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readingExport } from '../../src/lib/reading-export.mjs';
import { latestPredictions } from '../../src/lib/horizon-predictions.mjs';
import { FUTURES } from '../../src/lib/horizon-explorer.mjs';

const entry = (id, data = {}, body = 'Original body.') => ({ id, body, data: { title: id, date: new Date('2026-03-01'), tags: [], ...data } });

test('corrections precede the historical text and keep both dates and provenance', () => {
  const output = readingExport({ thoughts: [entry('corrected', {
    correction: { date: new Date('2026-09-13'), summary: 'The original reliability claim was unsupported.' },
    generated_by: 'thought_bot', model: 'recorded-model', cost_usd: 0,
  })] });
  assert.match(output, /Original publication date: 2026-03-01/);
  assert.match(output, /CORRECTION \(2026-09-13\): The original reliability claim was unsupported\./);
  assert.ok(output.indexOf('CORRECTION (') < output.indexOf('Original body.'));
  assert.match(output, /https:\/\/softcat.ai\/thoughts\/corrected/);
  assert.match(output, /Recorded generation cost \(USD, historical\): 0/);
});

test('recipes retain variables, illustrative targets, checks, limits and notes', () => {
  const output = readingExport({ prompts: [entry('extract', {
    prompt: 'Extract {{source}}', category: 'extraction', recipe: {
      reviewedAt: '2026-09-13', when: 'A small extraction.',
      inputs: { source: 'Supplied text.' }, exampleValues: { source: 'No due date stated.' },
      expected: '{"due_date":null}', checks: ['Parse the JSON.', 'Do not invent a date.'],
      limits: 'No reliability guarantee.', tool: '/lab/json-validator', previousRevision: 'a'.repeat(40),
    },
  }, 'Additional recipe notes.')] });
  for (const part of ['Extract {{source}}', 'Supplied text.', 'No due date stated.', '{"due_date":null}', 'Parse the JSON.', 'Do not invent a date.', 'No reliability guarantee.', 'not a recorded model response', 'Additional recipe notes.', 'https://softcat.ai/lab/json-validator']) assert.ok(output.includes(part), part);
});

test('all five collections exclude drafts and dates never imply a fresh news check', () => {
  const hidden = [entry('DO_NOT_PUBLISH', { draft: true })];
  const output = readingExport({ news: [entry('archived'), ...hidden], thoughts: hidden, tools: hidden, prompts: hidden, glossary: hidden });
  assert.doesNotMatch(output, /DO_NOT_PUBLISH/);
  assert.match(output, /Historical reports, retained with their original dates/);
  assert.match(output, /not a current news feed or newly verified claims/);
  assert.match(readingExport(), /Scope:/);
});

test('tool corrections include exact earlier text and evidence without changing source order', () => {
  const entries = [entry('z'), entry('a', { review: { reviewedAt: '2026-09-13', summary: 'Removed an unmeasured accuracy claim.', previousRevision: 'b'.repeat(40), evidence: ['https://github.com/valorifutures/softcat.ai/pull/213'] } })];
  const output = readingExport({ tools: entries });
  assert.match(output, /REVIEW \(2026-09-13\): Removed an unmeasured accuracy claim\./);
  assert.ok(output.includes(`/blob/${'b'.repeat(40)}/src/content/tools/a.md`));
  assert.match(output, /https:\/\/github.com\/valorifutures\/softcat.ai\/pull\/213/);
  assert.deepEqual(entries.map(record => record.id), ['z', 'a']);
  assert.ok(output.indexOf('### a') < output.indexOf('### z'));
});

test('Horizon exports the current predictions with exact targets, tests, review dates and evidence limitations', () => {
  const history = JSON.parse(readFileSync(new URL('../../src/data/horizon/prediction-history.json', import.meta.url)));
  const predictions = latestPredictions(history);
  const output = readingExport({ predictions });
  assert.equal(predictions.length, 5);
  assert.match(output, /not guarantees or dates supplied by the cited sources/);
  assert.match(output, /An elapsed countdown does not establish that the milestone was achieved/);
  for (const record of predictions) {
    const { key } = FUTURES.find(future => future.id === record.id);
    assert.ok(output.includes(`URL: https://softcat.ai/horizon/?future=${key}`));
    for (const value of [record.title, record.milestone, record.target_date, record.reviewed_at, record.rationale, record.uncertainty, record.earlier, record.later, ...record.resolution]) assert.ok(output.includes(value), value);
    for (const source of record.evidence) for (const value of [source.title, source.url, source.date_label, source.finding, source.limit]) assert.ok(output.includes(value), value);
  }
});
