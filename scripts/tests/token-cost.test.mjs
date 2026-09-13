import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCostTranscript, priceConversation, tokenCostReport, TOKEN_TEXT_LIMIT } from '../../src/lib/token-cost.mjs';
const count = text => text.length;
const model = { id: 'example/model', name: 'Example', inputPrice: 3, outputPrice: 15, pricingStatus: 'verified', pricingSource: 'https://openrouter.ai/api/v1/models', pricingCheckedAt: '2026-09-13T00:54:46Z', context: { status: 'reported', catalogueTokens: 200000, providerTokens: 200000, outputTokens: 64000, checkedAt: '2026-09-13T02:31:34Z' } };

test('system instructions and all earlier outputs are billed again for later replies', () => {
  const parsed = parseCostTranscript('System: abc\nUser: defg\nAssistant: hi\nUser: jklmn\nAssistant: opq', 'labels', count);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.usage.calls.map(call => [call.inputTokens, call.outputTokens]), [[7, 2], [14, 3]]);
  assert.equal(parsed.usage.inputTokens, 21);
  assert.equal(priceConversation(model, parsed.usage).cost, (21 * 3 + 5 * 15) / 1000000);
});

test('unlabelled and partly labelled input fails visibly without dropping its prelude', () => {
  for (const text of ['Hello there', 'Keep this instruction\nUser: Hello', 'System: Only instructions', 'User:\nAssistant: reply', 'Assistant: first', 'User: question\nAssistant: first\nAssistant: second']) assert.equal(parseCostTranscript(text, 'labels', count).ok, false, text);
  assert.equal(parseCostTranscript('', 'labels', count).ok, true);
});

test('code fences preserve role-like content and CRLF transcripts normalise line endings', () => {
  const raw = 'User: Read this\r\n```text\r\nAssistant: this is data\r\n```\r\nAssistant: Done';
  const parsed = parseCostTranscript(raw, 'labels', count);
  assert.equal(parsed.messages.length, 2);
  assert.match(parsed.messages[0].text, /Assistant: this is data/);
  assert.equal(parsed.messages[1].text, 'Done');
  assert.equal(parseCostTranscript('User: ```\nAssistant: still data', 'labels', count).ok, false);
  assert.equal(parseCostTranscript('Human: hi\nAI: hello', 'labels', count).messages[1].role, 'assistant');
});

test('message JSON preserves exact strings and refuses unsupported content or hidden tool charges', () => {
  const content = '  Assistant: literal data\n```\n';
  const parsed = parseCostTranscript(JSON.stringify([{ role: 'user', content }]), 'json', count);
  assert.equal(parsed.messages[0].text, content);
  assert.equal(parsed.messages[0].tokens, content.length);
  for (const input of ['{}', '[', '[]', '[null]', '[{"role":"tool","content":"x"}]', '[{"role":"user","content":[{"type":"image"}]}]', '[{"role":"user","content":"x","tool_calls":[]}]', '[{"role":"user","content":"x"},{"role":"system","content":"late"}]']) assert.equal(parseCostTranscript(input, 'json', count).ok, false, input);
});

test('input and message bounds reject oversized work without truncation', () => {
  assert.equal(parseCostTranscript('x'.repeat(TOKEN_TEXT_LIMIT + 1), 'labels', count).ok, false);
  assert.equal(parseCostTranscript(JSON.stringify(Array.from({ length: 201 }, () => ({ role: 'user', content: 'x' }))), 'json', count).ok, false);
});

test('a pending reply is an input-only subtotal and an impossible call never becomes a partial total', () => {
  const parsed = parseCostTranscript('User: abcd\nAssistant: ef\nUser: ghi', 'labels', count);
  const priced = priceConversation(model, parsed.usage);
  assert.equal(priced.pending, true);
  assert.deepEqual(priced.calls.map(call => call.inputTokens), [4, 9]);
  assert.equal(priced.cost, (13 * 3 + 2 * 15) / 1000000);
  const limited = { ...model, context: { ...model.context, providerTokens: 8 } };
  assert.equal(priceConversation(limited, parsed.usage).cost, null);
  assert.equal(priceConversation({ ...model, pricingStatus: 'not-listed' }, parsed.usage).cost, null);
});

test('reports preserve original material, source dates and omitted-output assumptions', () => {
  const transcript = 'User: abc\nAssistant: de\nUser: fg';
  const report = tokenCostReport(model, { mode: 'conversation', transcript }, count);
  assert.ok(report.includes(transcript)); assert.ok(report.includes(model.pricingCheckedAt));
  assert.match(report, /Pending output omitted: yes/);
  assert.match(report, /Call 2: 7 input, unknown output/);
  assert.match(tokenCostReport(model, { mode: 'single', input: 'abc' }, count), /no, input-only estimate/);
  assert.throws(() => tokenCostReport(model, { mode: 'conversation', transcript: 'unmarked' }, count));
});
