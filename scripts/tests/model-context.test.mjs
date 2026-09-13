import test from 'node:test';
import assert from 'node:assert/strict';
import { contextRecordFromCatalogue, contextRecordErrors, contextLimit, outputLimit, parseContextBudget, assessContext, contextReport } from '../../src/lib/model-context.mjs';
const checkedAt = new Date().toISOString();
const record = contextRecordFromCatalogue({ context_length: 1_000_000, top_provider: { context_length: 200_000, max_completion_tokens: 64_000 } }, checkedAt);
const model = { id: 'example/model', name: 'Example', context: record };
const fields = { system: '1000', history: '4000', documents: '10000', tools: '1000', output: '2000', headroom: '1000' };

test('context retains both exact quotes and takes the smaller known limit without rounding', () => {
  assert.equal(contextLimit(model), 200_000);
  assert.equal(record.catalogueTokens, 1_000_000);
  assert.equal(outputLimit(model), 64_000);
  const exact = { ...model, context: contextRecordFromCatalogue({ context_length: 1_047_576 }, checkedAt) };
  assert.equal(contextLimit(exact), 1_047_576);
  assert.equal(outputLimit(exact), null);
  assert.deepEqual(contextRecordErrors(model), []);
});

test('missing and malformed limits stay unknown instead of becoming zero or a legacy fallback', () => {
  for (const entry of [undefined, {}, { context_length: 0 }, { context_length: '200000' }, { context_length: Infinity }]) {
    const context = contextRecordFromCatalogue(entry, checkedAt);
    assert.equal(contextLimit({ context, contextK: 200 }), null);
    assert.deepEqual(contextRecordErrors({ context }), []);
  }
  assert.ok(contextRecordErrors({ context: { ...record, providerTokens: -1 } }).length);
  assert.ok(contextRecordErrors({ context: { ...record, status: 'not-listed' } }).length);
  assert.ok(contextRecordErrors({ context: { ...record, checkedAt: new Date(Date.now() + 86400000).toISOString() } }).length);
  assert.ok(contextRecordErrors({ context: { ...record, source: 'https://example.com' } }).length);
});

test('budget includes every input, reply and unbilled headroom, and rejects unsafe totals', () => {
  assert.deepEqual(parseContextBudget(fields), { ok: true, counts: { system: 1000, history: 4000, documents: 10000, tools: 1000, output: 2000, headroom: 1000 }, input: 16000, total: 19000, request: 18000 });
  for (const value of ['', '-1', '1.5', '1e5', 'Infinity', '9007199254740992']) assert.equal(parseContextBudget({ ...fields, system: value }).ok, false);
  assert.equal(parseContextBudget({ ...fields, system: '9007199254740991' }).ok, false);
});

test('the same request has different outcomes and both boundaries are inclusive', () => {
  const budget = parseContextBudget({ ...fields, documents: '191000', headroom: '1000' });
  assert.equal(budget.total, 200000);
  assert.equal(assessContext(model, budget).status, 'within');
  const over = assessContext(model, parseContextBudget({ ...fields, documents: '191001' }));
  assert.equal(over.status, 'over-context'); assert.equal(over.excess, 1);
  const small = { ...model, context: { ...record, catalogueTokens: 32768, providerTokens: 32768 } };
  assert.equal(assessContext(small, budget).excess, 167232);
  const largeReply = parseContextBudget({ ...fields, output: '64001' });
  assert.equal(assessContext(model, largeReply).status, 'over-output');
  assert.equal(assessContext(model, largeReply).outputExcess, 1);
  assert.equal(assessContext(model, parseContextBudget({ ...fields, output: '64000' })).status, 'within');
  assert.equal(assessContext({ ...model, context: { ...record, outputTokens: null } }, parseContextBudget(fields)).status, 'output-unknown');
});

test('zero is a deliberate empty budget and an unlisted model never becomes a fit', () => {
  const zero = parseContextBudget(Object.fromEntries(Object.keys(fields).map(key => [key, '0'])));
  assert.equal(assessContext(model, zero).remaining, 200000);
  assert.equal(assessContext({ ...model, context: contextRecordFromCatalogue(undefined, checkedAt) }, zero).status, 'unknown');
  assert.equal(assessContext(model, { ok: false }).status, 'invalid');
});

test('export preserves exact limits, all six assumptions and the dated source', () => {
  const report = contextReport(model, parseContextBudget(fields));
  assert.match(report, /Planning context limit: 200000/);
  assert.match(report, /Catalogue context: 1000000/);
  assert.match(report, /Extra headroom: 1000/);
  assert.match(report, /Total including reply and headroom: 19000/);
  assert.ok(report.includes(checkedAt));
  assert.match(report, /unused capacity, not billable input/);
  assert.throws(() => contextReport(model, { ok: false }));
});
