import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker as NodeWorker } from 'node:worker_threads';
import { validateStructuredOutput } from '../../src/lib/json-validation.mjs';
import { startJsonValidation } from '../../src/lib/json-validation-runner.mjs';
import { jsonValidationPresets } from '../../src/lib/json-validation-presets.mjs';

const check = (schema, value) => validateStructuredOutput(JSON.stringify(schema), JSON.stringify(value));

test('each example rejects its broken output and accepts its matching output', () => {
  for (const preset of jsonValidationPresets) {
    assert.equal(check(preset.schema, preset.valid).status, 'pass', preset.name);
    assert.equal(check(preset.schema, preset.invalid).status, 'fail', preset.name);
  }
  assert.deepEqual(check(jsonValidationPresets[0].schema, jsonValidationPresets[0].invalid).errors.map(error => error.rule), ['additionalProperties', 'enum', 'maximum']);
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
