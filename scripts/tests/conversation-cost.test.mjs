import test from 'node:test';
import assert from 'node:assert/strict';
import { conversationUsage } from '../../src/lib/conversation-cost.mjs';
const turns = [{ role: 'user', tokens: 100 }, { role: 'assistant', tokens: 20 }, { role: 'user', tokens: 50 }, { role: 'assistant', tokens: 10 }];

test('earlier user and assistant text is billed again as later input', () => {
  const usage = conversationUsage(turns);
  assert.equal(usage.inputTokens, 270); // 100 + (100 + 20 + 50)
  assert.equal(usage.outputTokens, 30);
  assert.deepEqual(usage.calls.map((call) => call.inputTokens), [100, 170]);
});
test('a trailing user message is a planned call with unknown output', () => {
  const usage = conversationUsage([...turns, { role: 'user', tokens: 25 }]);
  assert.equal(usage.calls.at(-1).inputTokens, 205);
  assert.equal(usage.calls.at(-1).pending, true);
  assert.equal(usage.outputTokens, 30);
  assert.equal(usage.inputTokens, 475);
});
test('empty input costs nothing and consecutive user blocks share one call', () => {
  assert.deepEqual(conversationUsage([]), { calls: [], inputTokens: 0, outputTokens: 0 });
  const usage = conversationUsage([{ role: 'user', tokens: 20 }, { role: 'user', tokens: 30 }, { role: 'assistant', tokens: 5 }]);
  assert.equal(usage.calls.length, 1);
  assert.equal(usage.inputTokens, 50);
});
