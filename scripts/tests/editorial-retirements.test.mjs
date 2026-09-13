import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateEditorialRetirements, retirementSourceUrl, retiredThoughtReferenceError } from '../../src/lib/editorial-retirements.mjs';
const review = JSON.parse(readFileSync(new URL('../../src/data/editorial-retirements.json', import.meta.url), 'utf8'));
const now = Date.now();

test('the retirement registry retains dated source records and resolvable Git links', () => {
  assert.deepEqual(validateEditorialRetirements(review, new Set(), now), []);
  for (const entry of review.entries) {
    const url = new URL(retirementSourceUrl(entry));
    assert.equal(url.host, 'github.com');
    assert.equal(url.pathname, `/valorifutures/softcat.ai/blob/${entry.sourceRevision}/src/content/thoughts/${entry.id}.md`);
  }
});

test('retired routes cannot silently reappear in the live content collection or collide', () => {
  const id = review.entries[0].id;
  assert.match(validateEditorialRetirements(review, new Set([id]), now).join('\n'), /live content collection/);
  const duplicate = structuredClone(review); duplicate.entries.push(duplicate.entries[0]);
  assert.match(validateEditorialRetirements(duplicate, new Set(), now).join('\n'), /duplicate retired route/);
});

test('invalid source paths, dates, revision hashes and missing reasons fail review validation', () => {
  for (const changes of [
    { id: '../outside' }, { sourcePath: 'src/pages/index.astro' }, { sourceRevision: 'main' },
    { sourceBlob: 'unknown' }, { addedCommit: '' }, { retiredAt: new Date(now + 2 * 86_400_000).toISOString().slice(0, 10) },
    { date: '2026-02-30' }, { retiredAt: '2020-01-01' }, { reason: 'missing-reason' }, { externalSourceLinks: 3 },
  ]) {
    const invalid = structuredClone(review); Object.assign(invalid.entries[0], changes);
    assert.ok(validateEditorialRetirements(invalid, new Set(), now).length > 0, JSON.stringify(changes));
  }
});

test('retired essay references remain valid only in archived Horizon records', () => {
  const ids = new Set(review.entries.map(entry => entry.id)), id = review.entries[0].id;
  for (const source of ['now-archive.json', 'retired-forecasts.json']) assert.equal(retiredThoughtReferenceError('thought', id, source, ids), null);
  for (const source of ['past.json', 'now.json', 'next.json']) assert.match(retiredThoughtReferenceError('thought', id, source, ids), /cannot support an active/);
  assert.equal(retiredThoughtReferenceError('thought', 'a-retained-article', 'now.json', ids), null);
});
