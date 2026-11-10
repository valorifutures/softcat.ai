import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker as NodeWorker } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { validateStructuredOutput } from '../../src/lib/json-validation.mjs';
import { startJsonValidation } from '../../src/lib/json-validation-runner.mjs';
import { jsonValidationPresets, jsonValidationPresetIndex, jsonValidationRecipeHref } from '../../src/lib/json-validation-presets.mjs';

const check = (schema, value) => validateStructuredOutput(JSON.stringify(schema), JSON.stringify(value));
const extraction = jsonValidationPresets[jsonValidationPresetIndex('recipe-invoice')];

test('each example rejects its broken output and accepts its matching output', () => {
  for (const preset of jsonValidationPresets) {
    assert.equal(check(preset.schema, preset.valid).status, 'pass', preset.name);
    assert.equal(check(preset.schema, preset.invalid).status, 'fail', preset.name);
  }
  assert.deepEqual(check(jsonValidationPresets[0].schema, jsonValidationPresets[0].invalid).errors.map(error => error.rule), ['additionalProperties', 'enum', 'maximum']);
});

test('the recipe handoff preserves the published target and its source', () => {
  const require = createRequire(import.meta.resolve('astro/package.json'));
  const yaml = require('js-yaml');
  const text = readFileSync(new URL('../../src/content/prompts/data-extraction.md', import.meta.url), 'utf8');
  const recipe = yaml.load(text.split(/^---\s*$/m)[1]);
  assert.deepEqual(extraction.valid, JSON.parse(recipe.recipe.expected));
  assert.equal(extraction.source, recipe.recipe.exampleValues.source.trim());
  assert.equal(check(extraction.schema, JSON.parse(recipe.recipe.expected)).status, 'pass');
  assert.equal(jsonValidationRecipeHref('data-extraction'), '/lab/json-validator?preset=recipe-invoice');
  assert.equal(jsonValidationRecipeHref('unknown-recipe'), null);
});

test('preset links accept only known IDs and preserve the older invoice-lines example', () => {
  assert.equal(new Set(jsonValidationPresets.map(preset => preset.id)).size, jsonValidationPresets.length);
  assert.equal(jsonValidationPresets[jsonValidationPresetIndex('classification')].name, 'Classification');
  assert.equal(jsonValidationPresets[jsonValidationPresetIndex('invoice-lines')].name, 'Invoice extraction');
  for (const id of [null, undefined, '', 'unknown', 'constructor', 'recipe-invoice&output=anything', { id: 'recipe-invoice' }]) {
    assert.equal(jsonValidationPresetIndex(id), -1);
  }
});

test('the extraction contract distinguishes absent keys, missing facts and malformed values', () => {
  const empty = structuredClone(extraction.valid);
  for (const object of [empty.values, empty.evidence]) {
    for (const field of Object.keys(object)) object[field] = null;
  }
  assert.equal(check(extraction.schema, empty).status, 'pass');
  for (const objectName of ['values', 'evidence']) {
    for (const field of Object.keys(extraction.valid[objectName])) {
      const omitted = structuredClone(extraction.valid);
      delete omitted[objectName][field];
      assert.equal(check(extraction.schema, omitted).status, 'fail', `${objectName}.${field} must remain present`);
    }
  }
  for (const mutate of [
    value => { value.values.amount = '129.50'; },
    value => { value.evidence.amount = 129.5; },
    value => { value.values.due_date = '2026-02-30'; value.evidence.due_date = '30 February'; },
    value => { value.evidence.due_date = 'not stated'; },
    value => { value.evidence.invoice_id = null; },
    value => { value.values.extra = 'invented'; },
    value => { value.evidence.extra = 'invented'; },
    value => { value.extra = 'invented'; },
  ]) {
    const output = structuredClone(extraction.valid); mutate(output);
    assert.equal(check(extraction.schema, output).status, 'fail');
  }
});

test('a well-shaped invention still needs the visible source check', () => {
  const invented = structuredClone(extraction.valid);
  invented.values.due_date = '2026-10-01';
  invented.evidence.due_date = 'Due 1 October 2026';
  assert.equal(check(extraction.schema, invented).status, 'pass');
  assert.ok(!extraction.source.includes(invented.evidence.due_date));
});

test('syntax-only, boolean schemas and invalid schema shapes have distinct outcomes', () => {
  assert.equal(validateStructuredOutput('', '{"x":1}').status, 'syntax-pass');
  assert.equal(validateStructuredOutput('', '{x:1}').status, 'json-error');
  assert.equal(validateStructuredOutput('{', '{}').status, 'schema-error');
  assert.equal(check(true, { anything: 1 }).status, 'pass');
  assert.equal(check(false, { anything: 1 }).status, 'fail');
  for (const invalid of [null, [], 'not a schema', 1]) assert.equal(check(invalid, {}).status, 'schema-error');
});

test('unsupported keywords, formats, drafts, remote references and async schemas never pass', () => {
  for (const schema of [
    { type: 'number', minimumm: 5 }, { type: 'string', format: 'invented-format' },
    { $schema: 'https://json-schema.org/draft/2019-09/schema' },
    { $ref: 'https://example.com/remote-schema.json' }, { $async: true, type: 'object' },
    { type: 'string', pattern: '[' },
  ]) assert.equal(check(schema, {}).status, 'schema-error', JSON.stringify(schema));
});

test('draft-07 tuples and 2020-12 prefix items follow their own draft', () => {
  const draft7 = { $schema: 'http://json-schema.org/draft-07/schema#', type: 'array', items: [{ type: 'string' }, { type: 'integer' }], additionalItems: false };
  const draft2020 = { type: 'array', prefixItems: [{ type: 'string' }, { type: 'integer' }], items: false };
  for (const schema of [draft7, draft2020]) {
    assert.equal(check(schema, ['a', 1]).status, 'pass');
    assert.equal(check(schema, ['a', 1, 'extra']).status, 'fail');
    assert.equal(check(schema, ['a', '1']).status, 'fail');
  }
  assert.equal(check(draft7, ['a', 1]).draft, 'draft-07');
  assert.equal(check(draft2020, ['a', 1]).draft, '2020-12');
});

test('null types, union types and structural enums are validated without coercion', () => {
  assert.equal(check({ type: 'null' }, null).status, 'pass');
  assert.equal(check({ type: ['string', 'null'] }, null).status, 'pass');
  assert.equal(check({ enum: [{ a: 1, b: 2 }] }, { b: 2, a: 1 }).status, 'pass');
  assert.equal(check({ type: 'integer' }, '4').status, 'fail');
  assert.equal(check({ type: 'object', required: ['x'], properties: { x: { type: 'integer', default: 4 } } }, {}).status, 'fail');
  assert.equal(check({ type: 'object', required: ['toString'] }, {}).status, 'fail');
});

test('alternatives, conditionals and array constraints are enforced', () => {
  assert.equal(check({ oneOf: [{ type: 'number' }, { minimum: 0 }] }, 1).status, 'fail');
  const conditional = { type: 'object', properties: { kind: { type: 'string' }, source: { type: 'string' } }, if: { properties: { kind: { const: 'claim' } }, required: ['kind'] }, then: { required: ['source'] } };
  assert.equal(check(conditional, { kind: 'claim' }).status, 'fail');
  assert.equal(check(conditional, { kind: 'claim', source: 'paper' }).status, 'pass');
  assert.equal(check({ type: 'array', uniqueItems: true, minItems: 2, items: { type: 'integer' } }, [1, 1]).status, 'fail');
});

test('error paths escape property names and reports are bounded', () => {
  const result = check({ type: 'object', required: ['a/b~c'], additionalProperties: false }, { 'x/y': 1 });
  assert.ok(result.errors.some(error => error.path === '/a~1b~0c'));
  assert.ok(result.errors.some(error => error.path === '/x~1y'));
  const many = check({ type: 'array', items: { type: 'integer' } }, Array(120).fill('wrong'));
  assert.equal(many.totalErrors, 120); assert.equal(many.errors.length, 100); assert.equal(many.truncated, true);
  assert.equal(validateStructuredOutput('', ' '.repeat(1_000_001)).status, 'limit');
});

test('cancelled jobs cannot publish stale results and completed jobs terminate their worker', () => {
  let terminated = 0, received = 0;
  const worker = { postMessage() {}, terminate() { terminated++; } };
  const stop = startJsonValidation('{}', '{}', () => received++, { createWorker: () => worker });
  stop(); worker.onmessage({ data: { status: 'pass' } });
  assert.equal(received, 0); assert.equal(terminated, 1);
  const worker2 = { postMessage() {}, terminate() { terminated++; } };
  startJsonValidation('{}', '{}', () => received++, { createWorker: () => worker2 });
  worker2.onmessage({ data: { status: 'pass' } }); worker2.onmessage({ data: { status: 'pass' } });
  assert.equal(received, 1); assert.equal(terminated, 2);
});

test('a real worker with a pathological pattern is stopped without reporting a pass', async () => {
  let terminated = false;
  const moduleUrl = new URL('../../src/lib/json-validation.mjs', import.meta.url).href;
  const createWorker = () => {
    const worker = new NodeWorker(`const {parentPort}=require('node:worker_threads'); import(${JSON.stringify(moduleUrl)}).then(({validateStructuredOutput})=>parentPort.on('message', d=>parentPort.postMessage(validateStructuredOutput(d.schemaText,d.outputText))));`, { eval: true });
    const bridge = { postMessage: data => worker.postMessage(data), terminate: () => { terminated = true; void worker.terminate(); } };
    worker.on('message', data => bridge.onmessage?.({ data })); worker.on('error', () => bridge.onerror?.());
    return bridge;
  };
  const result = await new Promise(resolve => startJsonValidation(JSON.stringify({ type: 'string', pattern: '(a+)+$' }), JSON.stringify('a'.repeat(80) + '!'), resolve, { createWorker, timeoutMs: 500 }));
  assert.equal(result.status, 'timeout'); assert.equal(terminated, true);
});
