import test from 'node:test';
import assert from 'node:assert/strict';
import { hasWeightRecord, weightLabel, weightRecordErrors } from '../../src/lib/model-weights.mjs';
import { workloadCsv } from '../../src/lib/model-workload.mjs';

const record = { source: 'https://huggingface.co/example/model/tree/' + 'a'.repeat(40), checkedAt: '2026-09-13T00:00:00Z', licence: 'custom-licence', access: 'gated', fileCount: 12 };

test('missing weight evidence stays unspecified and gated files retain their access condition', () => {
  assert.equal(hasWeightRecord({ weights: null }), false);
  assert.equal(weightLabel({ weights: null }), 'No weight source recorded');
  assert.deepEqual(weightRecordErrors({ weights: null }), []);
  assert.equal(weightLabel({ weights: record }), 'Weight files listed, access gated');
  assert.equal(weightLabel({ weights: { ...record, access: 'public' } }), 'Published weight files');
  assert.deepEqual(weightRecordErrors({ weights: record }), []);
});

test('weight records require an exact revision, real file count, date and licence declaration', () => {
  for (const change of [{ source: 'https://huggingface.co/example/model' }, { source: 'https://example.com/model/tree/' + 'a'.repeat(40) }, { fileCount: 0 }, { checkedAt: '2999-01-01' }, { access: 'unknown' }, { licence: '' }]) {
    assert.ok(weightRecordErrors({ weights: { ...record, ...change } }).length, JSON.stringify(change));
  }
  assert.ok(weightRecordErrors({}).length);
});

test('CSV preserves weight provenance and does not turn published weights into free API pricing', () => {
  const model = { name: 'Example', id: 'example/model', provider: 'Example', contextK: 128, pricingStatus: 'not-listed', inputPrice: null, outputPrice: null, weights: record };
  const csv = workloadCsv([{ model, estimate: { status: 'unknown-price', cost: null } }], { ok: true, inputTokens: 1000, outputTokens: 500, calls: 1000 });
  assert.match(csv, /"unknown-price","","https:\/\/huggingface.co\/example\/model\/tree\/a{40}","custom-licence","gated","2026-09-13T00:00:00Z"/);
});
