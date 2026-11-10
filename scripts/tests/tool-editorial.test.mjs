import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toolReviewErrors, toolRetirementErrors } from '../../src/lib/tool-editorial.mjs';

test('a published tool guide needs a dated correction and project evidence', () => {
  const entry = { date: '2026-04-03', review: { reviewedAt: '2026-09-13', previousRevision: 'a'.repeat(40), summary: 'Corrected against the actual implementation.', evidence: ['https://github.com/valorifutures/softcat.ai/pull/212'] } };
  assert.deepEqual(toolReviewErrors(entry), []);
  assert.deepEqual(toolReviewErrors({ draft: true }), []);
  assert.ok(toolReviewErrors({}).length);
  for (const change of [{ reviewedAt: '2999-01-01' }, { reviewedAt: '2026-04-02' }, { previousRevision: 'main' }, { summary: '' }, { evidence: ['https://example.com/claim'] }]) assert.ok(toolReviewErrors({ ...entry, review: { ...entry.review, ...change } }).length);
});

test('tool retirements preserve source history without claiming product failure', () => {
  const review = JSON.parse(readFileSync(new URL('../../src/data/tool-retirements.json', import.meta.url)));
  assert.deepEqual(toolRetirementErrors(review), []);
  assert.ok(toolRetirementErrors(review, new Set([review.entries[0].id])).length);
  assert.ok(toolRetirementErrors({ ...review, entries: [...review.entries, review.entries[0]] }).length);
  for (const change of [{ sourceBlob: 'main' }, { sourcePath: 'unrelated.md' }, { date: '2999-01-01' }, { lastLinkCheck: 'invalid' }, { sourceLink: 'javascript:alert(1)' }]) assert.ok(toolRetirementErrors({ ...review, entries: [{ ...review.entries[0], ...change }] }).length);
});
