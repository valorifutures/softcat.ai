import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { WORKBENCH_KEY, FIELD_LIMIT, variableKeys, fillPrompt, renderPrompt, requestBody, curlRequest, parsePromptLibrary, writePromptLibrary, parseWorkbenchHandoff } from '../../src/lib/prompt-workbench.mjs';
import { workbenchPresets } from '../../src/lib/prompt-workbench-presets.mjs';
import { validateStructuredOutput } from '../../src/lib/json-validation.mjs';

const prompt = { name: 'Saved example', system: 'Use {{source}}.', user: 'Question: {{question}}', assistant: '', vars: { source: 'the supplied text', question: 'What changed?' }, timestamp: 1_800_000_000_000 };
const makeStorage = (initial = null) => {
  let value = initial;
  return { getItem(key) { assert.equal(key, WORKBENCH_KEY); return value; }, setItem(key, raw) { assert.equal(key, WORKBENCH_KEY); value = raw; }, value: () => value };
};

test('variables are separate per message and replacement is literal, own-property and non-recursive', () => {
  assert.deepEqual(variableKeys('{{part', '}} {{ full-name }} {{full-name}} {{question}}'), ['full-name', 'question']);
  assert.equal(fillPrompt('{{toString}} {{x}}', { x: '{{question}}' }), '{{toString}} {{question}}');
  const vars = JSON.parse('{"__proto__":"literal data","toString":"a value"}');
  assert.equal(fillPrompt('{{__proto__}} {{toString}}', vars), 'literal data a value');
  assert.deepEqual(renderPrompt({ ...prompt, vars: { source: ' ', question: '0' } }).missing, ['source']);
  assert.equal(fillPrompt('{{question}}', { question: '0' }), '0');
});

test('large variable expansions stop before building an oversized message', () => {
  assert.equal(fillPrompt('{{x}}', { x: 'a'.repeat(FIELD_LIMIT) }).length, FIELD_LIMIT);
  assert.throws(() => fillPrompt('{{x}}{{x}}', { x: 'a'.repeat(FIELD_LIMIT) }), /exceeds/);
  assert.throws(() => fillPrompt('a'.repeat(FIELD_LIMIT + 1), {}), /exceeds/);
});

test('OpenRouter JSON preserves message roles, optional prefix and exact model ID', () => {
  const rendered = renderPrompt({ ...prompt, assistant: 'A prefix' });
  const body = requestBody(rendered, 'anthropic/claude-sonnet-4');
  assert.equal(body.model, 'anthropic/claude-sonnet-4');
  assert.equal(body.max_tokens, 2048);
  assert.deepEqual(body.messages, [
    { role: 'system', content: 'Use the supplied text.' },
    { role: 'user', content: 'Question: What changed?' },
    { role: 'assistant', content: 'A prefix' },
  ]);
  assert.throws(() => requestBody({ ...rendered, missing: ['source'] }, body.model), /Fill every/);
  assert.throws(() => requestBody({ ...rendered, user: ' ' }, body.model), /user message/);
  assert.throws(() => requestBody(rendered, 'not a model'), /Choose a model/);
});

test('the cURL export survives a POSIX shell without changing quotes, substitutions or Unicode', () => {
  const user = 'O\'Reilly says "hello". Keep $HOME, `printf wrong`, $(printf wrong), \\ and a newline\n猫 literally.';
  const body = requestBody({ system: 'A system message', user, assistant: '', missing: [] }, 'openai/gpt-4.1');
  const script = 'curl() { printf \'%s\\0\' "$@"; }\n' + curlRequest(body);
  const result = spawnSync('/bin/sh', ['-c', script], { env: { PATH: '/usr/bin:/bin', OPENROUTER_API_KEY: 'fixture-key' } });
  assert.equal(result.status, 0, result.stderr.toString());
  const args = result.stdout.toString().split('\0').slice(0, -1);
  assert.equal(args[1], 'https://openrouter.ai/api/v1/chat/completions');
  assert.ok(args.includes('Authorization: Bearer fixture-key'));
  assert.deepEqual(JSON.parse(args[args.indexOf('--data-raw') + 1]), body);
  assert.equal(args.length, 8);
});

test('a shell export without an API key stops before the stub request function', () => {
  const body = requestBody(renderPrompt(prompt), 'openai/gpt-4.1');
  const result = spawnSync('/bin/sh', ['-c', 'curl() { printf request-ran; }\n' + curlRequest(body)], { env: { PATH: '/usr/bin:/bin' } });
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout.toString(), '');
});

test('all example variables are filled and the invoice uses a working JSON Schema', () => {
  for (const preset of workbenchPresets) {
    assert.deepEqual(renderPrompt(preset).missing, [], preset.name);
    assert.equal(requestBody(renderPrompt(preset), 'openai/gpt-4.1').messages.at(-1).role, 'user');
  }
  const schema = workbenchPresets.find((preset) => preset.name === 'Extract an invoice').vars.schema;
  assert.equal(validateStructuredOutput(schema, JSON.stringify({ invoice_id: 'EX-104', date: '2026-09-12', total: 24.5, currency: 'GBP' })).status, 'pass');
  assert.equal(validateStructuredOutput(schema, JSON.stringify({ invoice_id: null, date: null, total: null, currency: null })).status, 'pass');
  assert.equal(validateStructuredOutput(schema, JSON.stringify({ invoice_id: 'EX-104', date: 'yesterday', total: -4, currency: 'GBP', invented: true })).status, 'fail');
});

test('legacy libraries and versioned backups preserve all prompt content and earlier versions', () => {
  const legacy = [{ ...prompt, assistant: '{', vars: JSON.parse('{"source":"a","question":"b","__proto__":"literal"}') }];
  assert.deepEqual(parsePromptLibrary(JSON.stringify(legacy)), legacy);
  const versions = [prompt, { ...prompt, id: 'second', timestamp: prompt.timestamp + 1, user: 'A later version' }];
  assert.deepEqual(parsePromptLibrary(JSON.stringify({ version: 1, prompts: versions })), versions);
  const storage = makeStorage(JSON.stringify([prompt]));
  writePromptLibrary(storage, JSON.stringify([prompt]), versions);
  assert.deepEqual(JSON.parse(storage.value()), versions);
  assert.equal(JSON.parse(storage.value())[0].user, prompt.user);
});

test('invalid libraries are rejected as a whole, including oversized values and duplicate IDs', () => {
  for (const raw of ['{', 'null', '{}', '[null]', JSON.stringify({ version: 2, prompts: [prompt] }), JSON.stringify([prompt, { ...prompt, vars: [] }]), JSON.stringify([{ ...prompt, user: 'x'.repeat(FIELD_LIMIT + 1) }]), JSON.stringify([{ ...prompt, id: 'same' }, { ...prompt, id: 'same' }])]) assert.throws(() => parsePromptLibrary(raw));
  assert.throws(() => parsePromptLibrary(JSON.stringify(Array.from({ length: 501 }, () => prompt))), /500/);
  assert.throws(() => parsePromptLibrary(' '.repeat(5_000_001)), /large/);
  assert.throws(() => parsePromptLibrary('猫'.repeat(1_700_000)), /large/);
});

test('storage errors and concurrent edits cannot erase the last saved library', () => {
  const initial = JSON.stringify([prompt]);
  const storage = makeStorage(initial);
  assert.throws(() => writePromptLibrary(storage, null, []), /another tab/);
  assert.equal(storage.value(), initial);
  assert.throws(() => writePromptLibrary(storage, initial, [{ ...prompt, system: 7 }]), /invalid/);
  assert.equal(storage.value(), initial);
  let writes = 0;
  const full = { getItem: () => initial, setItem() { writes++; throw new Error('quota exceeded'); } };
  assert.throws(() => writePromptLibrary(full, initial, []), /quota exceeded/);
  assert.equal(writes, 1);
  assert.equal(full.getItem(), initial);
});

test('a Workbench transfer retains both messages and the model, with bounded content and age', () => {
  const now = 1_800_000_000_000;
  const draft = { version: 2, createdAt: now, system: '', user: 'The unsent draft', model: 'openai/gpt-4.1' };
  assert.deepEqual(parseWorkbenchHandoff(JSON.stringify(draft), now), { system: '', user: draft.user, model: draft.model });
  for (const invalid of [null, '{', JSON.stringify({ ...draft, user: {} }), JSON.stringify({ ...draft, user: ' ' }), JSON.stringify({ ...draft, user: 'x'.repeat(FIELD_LIMIT + 1) }), JSON.stringify({ ...draft, createdAt: now - 1_800_001 }), JSON.stringify({ ...draft, createdAt: now + 60_001 }), JSON.stringify({ ...draft, version: 1 })]) assert.equal(parseWorkbenchHandoff(invalid, now), null);
});
