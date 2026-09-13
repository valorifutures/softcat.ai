import test from 'node:test';
import assert from 'node:assert/strict';
import { pricePerMillion, planPriceSnapshot, PRICE_SOURCE } from '../model-price-snapshot.mjs';

const checkedAt = '2026-09-13T00:35:00Z';
const roster = () => Array.from({ length: 5 }, (_, i) => ({ id: `example/model-${i}`, name: `Model ${i}`, provider: 'Example', contextK: 128,
  inputPrice: 1, outputPrice: 2, pricingStatus: 'verified', pricingCheckedAt: '2026-09-12T12:00:00Z', pricingSource: PRICE_SOURCE,
  weights: { source: 'kept-exactly', licence: 'custom' }, trackedSince: '2026-02-01' }));
const catalogue = () => ({ data: roster().map(model => ({ id: model.id, pricing: { prompt: '0.000001', completion: '0.000002' }, context_length: 999999 })) });

test('only finite non-negative decimal quotes are prices and explicit zero is valid', () => {
  assert.equal(pricePerMillion('0'), 0);
  assert.equal(pricePerMillion('0.00000036'), 0.36);
  assert.equal(pricePerMillion('1.5e-6'), 1.5);
  assert.ok(pricePerMillion('1e-20') > 0);
  for (const invalid of [null, undefined, '', ' ', '0x10', '-1', Infinity, NaN, true, [], {}, '1e999', '1e-999']) assert.equal(pricePerMillion(invalid), null);
});

test('snapshot uses exact roster IDs, preserves non-price data and never mutates inputs', () => {
  const models = roster(), original = structuredClone(models), data = catalogue();
  data.data[0].pricing.prompt = '0.0000015';
  data.data.push({ id: 'new/untracked-model', pricing: { prompt: '0', completion: '0' } });
  const plan = planPriceSnapshot(models, data, checkedAt);
  assert.deepEqual(models, original);
  assert.equal(plan.models.length, models.length);
  assert.equal(plan.models[0].inputPrice, 1.5);
  assert.equal(plan.models[0].contextK, 128);
  assert.deepEqual(plan.models[0].weights, original[0].weights);
  assert.equal(plan.models[0].trackedSince, original[0].trackedSince);
  assert.equal(plan.models[0].pricingCheckedAt, checkedAt);
  assert.equal(plan.summary.priceChanges, 1);
  assert.equal(plan.summary.verified, 5);
});

test('large changes, zero-to-paid changes and locked prices require review', () => {
  const models = roster(), data = catalogue();
  data.data[0].pricing.prompt = '0.00000151';
  models[1].inputPrice = 0;
  models[2].lockedFields = ['outputPrice']; data.data[2].pricing.completion = '0.0000021';
  const plan = planPriceSnapshot(models, data, checkedAt);
  assert.equal(plan.summary.reviewNeeded, 3);
  assert.equal(plan.models[0].inputPrice, 1);
  assert.equal(plan.models[1].inputPrice, 0);
  assert.equal(plan.models[2].outputPrice, 2);
  assert.equal(plan.checks[0].issues[0].reason, 'delta-over-50-percent');
  assert.equal(plan.checks[2].issues[0].reason, 'locked');
  assert.equal(plan.checks[2].quoted.outputPrice, 2.1);
});

test('unlisted and invalid quotes remain unknown without erasing valid identity data', () => {
  const models = roster(), data = catalogue();
  data.data.pop(); delete data.data[0].pricing.completion;
  const plan = planPriceSnapshot(models, data, checkedAt);
  assert.equal(plan.models[4].pricingStatus, 'not-listed');
  assert.equal(plan.models[4].inputPrice, null); assert.equal(plan.models[4].outputPrice, null);
  assert.equal(plan.models[4].name, 'Model 4');
  assert.equal(plan.models[0].pricingStatus, 'unverified'); assert.equal(plan.models[0].outputPrice, null);
  assert.equal(plan.summary.notListed, 1); assert.equal(plan.summary.unverified, 1);
});

test('a genuine zero quote stays verified when it matches the recorded price', () => {
  const models = roster(), data = catalogue();
  models[0].inputPrice = 0; models[0].outputPrice = 0;
  data.data[0].pricing = { prompt: '0', completion: '0' };
  const plan = planPriceSnapshot(models, data, checkedAt);
  assert.equal(plan.models[0].pricingStatus, 'verified'); assert.equal(plan.models[0].outputPrice, 0);
});

test('empty, incomplete or ambiguous catalogues fail before producing an update plan', () => {
  const data = catalogue();
  for (const bad of [{}, { data: [] }, { data: data.data.slice(0, 3) }, { data: [...data.data, data.data[0]] }, { data: [...data.data, {}] }]) {
    assert.throws(() => planPriceSnapshot(roster(), bad, checkedAt));
  }
  assert.throws(() => planPriceSnapshot([...roster(), roster()[0]], data, checkedAt));
  assert.throws(() => planPriceSnapshot(roster(), data, 'not a date'));
});
