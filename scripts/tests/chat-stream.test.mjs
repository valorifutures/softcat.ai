import test from 'node:test';
import assert from 'node:assert/strict';
import { readChatStream } from '../../src/lib/chat-stream.mjs';

const encoder = new TextEncoder();
function stream(chunks) { return new ReadableStream({ start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); } }); }
const wire = ': keepalive\r\ndata: {"choices":[{"delta":{"content":"Hello 🐈"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":" world"},"finish_reason":"stop"}],"usage":{"prompt_tokens":12,"completion_tokens":4}}\n\ndata: [DONE]\n\n';

test('every split point preserves the same response, including UTF-8 boundaries', async () => {
  const bytes = encoder.encode(wire);
  for (let split = 1; split < bytes.length; split++) {
    const updates = [];
    const result = await readChatStream(stream([bytes.slice(0, split), bytes.slice(split)]), (text) => updates.push(text));
    assert.equal(result.text, 'Hello 🐈 world');
    assert.equal(result.usage.prompt_tokens, 12);
    assert.equal(updates.at(-1), result.text);
  }
});
test('one-byte chunks and multiple events in one chunk are both accepted', async () => {
  const bytes = encoder.encode(wire);
  assert.equal((await readChatStream(stream([...bytes].map((byte) => new Uint8Array([byte]))))).text, 'Hello 🐈 world');
  assert.equal((await readChatStream(stream([bytes]))).text, 'Hello 🐈 world');
});
test('multi-line data and a completed final event without a newline are accepted', async () => {
  const body = 'data: {"choices":\ndata: [{"delta":{"content":"ok"},"finish_reason":"stop"}]}';
  assert.equal((await readChatStream(stream([encoder.encode(body)]))).text, 'ok');
});
test('provider errors and truncated connections are visible failures', async () => {
  await assert.rejects(readChatStream(stream([encoder.encode('data: {"error":{"message":"Capacity reached"}}\n\n')])), /Capacity reached/);
  await assert.rejects(readChatStream(stream([encoder.encode('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n')])), /before the response completed/);
  await assert.rejects(readChatStream(stream([encoder.encode('data: {"choices":')])), /unreadable stream/);
  await assert.rejects(readChatStream(stream([encoder.encode('data: [DONE]\n\n')])), /without a text response/);
});
test('reader failures propagate and release the lock', async () => {
  const body = new ReadableStream({ pull(controller) { controller.error(new Error('Network interrupted')); } });
  await assert.rejects(readChatStream(body), /Network interrupted/);
  assert.equal(body.locked, false);
});
