import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkload, estimateWorkload, compareWorkloadRows, workloadMoney, workloadCsv, csvCell } from '../../src/lib/model-workload.mjs';

const paid = { name: 'Example', id: 'example/model', provider: 'Example', inputPrice: 3, outputPrice: 15, contextK: 200, pricingStatus: 'verified', pricingCheckedAt: '2026-09-12T21:57:43Z', pricingSource: 'https://openrouter.ai/api/v1/models', openSource: false };

test('workload accepts explicit whole counts and rejects blank, fractional and unsafe totals', () => {
  assert.deepEqual(parseWorkload('1000', '500', '1000'), { ok: true, inputTokens: 1000, outputTokens: 500, calls: 1000 });
  assert.equal(parseWorkload('0', '0', '0').ok, true);
  for (const invalid of ['', ' ', '-1', '0.5', 'Infinity', '1e3', 'NaN', '9007199254740992']) {
    for (const position of [0, 1, 2]) {
      const fields = ['1', '1', '1']; fields[position] = invalid;
      assert.equal(parseWorkload(...fields).ok, false, `${position}: ${invalid}`);
    }
  }
  assert.equal(parseWorkload('9007199254740991', '1', '0').ok, false);
  assert.equal(parseWorkload('100000000', '100000000', '100000000').ok, false);
});

test('known prices calculate both directions of tokens for every call without making unknowns free', () => {
  assert.deepEqual(estimateWorkload(paid, parseWorkload('1000', '500', '1000')), { status: 'estimated', cost: 10.5 });
  assert.equal(estimateWorkload(paid, parseWorkload('1000', '500', '0')).cost, 0);
  assert.equal(estimateWorkload({ ...paid, inputPrice: 0, outputPrice: 0 }, parseWorkload('1000', '500', '1000')).cost, 0);
  for (const model of [{ ...paid, pricingStatus: 'not-listed', inputPrice: null, outputPrice: null }, { ...paid, pricingStatus: 'review-needed' }, { ...paid, outputPrice: NaN }]) {
    assert.deepEqual(estimateWorkload(model, parseWorkload('0', '0', '0')), { status: 'unknown-price', cost: null });
  }
  assert.equal(workloadMoney(0.00001), '$0.00001');
  assert.equal(workloadMoney(0.0000001), '<$0.000001');
});

test('saved context includes output, with explicit boundary and unknown states', () => {
  assert.equal(estimateWorkload(paid, parseWorkload('199500', '500', '1')).status, 'estimated');
  assert.deepEqual(estimateWorkload(paid, parseWorkload('199501', '500', '1')), { status: 'above-saved-context', cost: null });
  assert.equal(estimateWorkload({ ...paid, contextK: 0 }, parseWorkload('1', '1', '1')).status, 'unknown-context');
  assert.equal(estimateWorkload(paid, parseWorkload('', '500', '1')).cost, null);
});

test('unknown costs and rates sort last in both directions', () => {
  const workload = parseWorkload('1000', '500', '1000');
  const rows = [paid, { ...paid, name: 'Cheap', inputPrice: 0.1, outputPrice: 0.2 }, { ...paid, name: 'Unknown', pricingStatus: 'not-listed', inputPrice: null, outputPrice: null }].map(model => ({ model, estimate: estimateWorkload(model, workload) }));
  for (const key of ['cost', 'inputPrice', 'outputPrice']) {
    assert.deepEqual([...rows].sort((a, b) => compareWorkloadRows(a, b, key, 1)).map(row => row.model.name), ['Cheap', 'Example', 'Unknown']);
    assert.deepEqual([...rows].sort((a, b) => compareWorkloadRows(a, b, key, -1)).map(row => row.model.name), ['Example', 'Cheap', 'Unknown']);
  }
});

test('CSV preserves assumptions and source dates, leaves unknown amounts blank and neutralises formula text', () => {
  const workload = parseWorkload('1000', '500', '1000');
  const rows = [paid, { ...paid, name: 'Unknown', pricingStatus: 'not-listed', inputPrice: null, outputPrice: null }].map(model => ({ model, estimate: estimateWorkload(model, workload) }));
  const csv = workloadCsv(rows, workload);
  assert.match(csv, /"2026-09-12T21:57:43Z","https:\/\/openrouter.ai\/api\/v1\/models","1000","500","1000","estimated","10.5"/);
  assert.match(csv, /"unknown-price","","","","",""\r\n$/);
  for (const value of ['=1+1', ' +cmd', '-5', '@SUM(A1)', '\tunsafe', '\nunsafe']) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('A, "quoted" model'), '"A, ""quoted"" model"');
});
