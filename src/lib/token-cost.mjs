import { conversationUsage } from './conversation-cost.mjs';
import { contextLimit, outputLimit } from './model-context.mjs';
import { estimateWorkload } from './model-workload.mjs';

export const TOKEN_TEXT_LIMIT = 200_000;
export const MESSAGE_LIMIT = 200;
const aliases = { system: 'system', user: 'user', human: 'user', assistant: 'assistant', ai: 'assistant' };

function validateMessages(messages, estimateTokens) {
  if (messages.length > MESSAGE_LIMIT) throw new Error(`Use no more than ${MESSAGE_LIMIT} messages in one transcript.`);
  let userSeen = false, sinceReply = false;
  return messages.map((message, index) => {
    if (!message || typeof message !== 'object' || Array.isArray(message) || Object.keys(message).some(key => !['role', 'content'].includes(key))) throw new Error(`Message ${index + 1} must contain only role and content. Tool, image and audio messages are not supported by this text estimate.`);
    if (!['system', 'user', 'assistant'].includes(message.role)) throw new Error(`Message ${index + 1} needs a system, user or assistant role.`);
    if (typeof message.content !== 'string' || !message.content.trim()) throw new Error(`Message ${index + 1} needs non-empty text content.`);
    if (message.role === 'system' && userSeen) throw new Error(`Message ${index + 1}: place system instructions before the first user message.`);
    if (message.role === 'user') { userSeen = true; sinceReply = true; }
    if (message.role === 'assistant') {
      if (!sinceReply) throw new Error(`Message ${index + 1}: each assistant reply needs a preceding user message. Combine fragments of the same reply.`);
      sinceReply = false;
    }
    return { role: message.role, text: message.content, tokens: estimateTokens(message.content), turnNumber: index + 1 };
  });
}

function labelledMessages(raw) {
  const messages = [];
  let role = '', lines = [], fence = null;
  const flush = () => { if (role) messages.push({ role, content: lines.join('\n') }); };
  for (const [index, line] of raw.split(/\r\n|\n|\r/).entries()) {
    const marker = !fence && /^(system|user|human|assistant|ai)\s*:[ \t]?/i.exec(line);
    if (marker) {
      flush(); role = aliases[marker[1].toLowerCase()]; lines = [];
      const rest = line.slice(marker[0].length); lines.push(rest);
      const opening = /^\s*(`{3,}|~{3,})/.exec(rest);
      if (opening) fence = { char: opening[1][0], length: opening[1].length };
      continue;
    }
    if (!role) {
      if (line.trim()) throw new Error(`Line ${index + 1} has text before a role label. Start with System: or User:, or use the message JSON format.`);
      continue;
    }
    lines.push(line);
    const match = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (match) {
      if (!fence) fence = { char: match[1][0], length: match[1].length };
      else if (match[1][0] === fence.char && match[1].length >= fence.length && !match[2].trim()) fence = null;
    }
  }
  if (fence) throw new Error('A code fence is still open. Close it, or use message JSON to preserve literal role labels and fences.');
  flush(); return messages;
}

export function parseCostTranscript(raw, format, estimateTokens) {
  try {
    if (typeof raw !== 'string' || raw.length > TOKEN_TEXT_LIMIT) throw new Error(`Use no more than ${TOKEN_TEXT_LIMIT.toLocaleString('en-GB')} characters in the transcript.`);
    if (!['labels', 'json'].includes(format)) throw new Error('Choose role-labelled text or message JSON.');
    if (!raw.trim()) return { ok: true, messages: [], usage: conversationUsage([]) };
    const input = format === 'json' ? JSON.parse(raw) : labelledMessages(raw);
    if (!Array.isArray(input)) throw new Error('Message JSON must be an array of objects with role and content fields, with content as a string.');
    if (!input.length) throw new Error('The message array is empty. Add a user message to estimate a call.');
    const messages = validateMessages(input, estimateTokens);
    if (!messages.some(message => message.role === 'user')) throw new Error('Add a user message after the system instructions to estimate a call.');
    return { ok: true, messages, usage: conversationUsage(messages) };
  } catch (error) { return { ok: false, error: error instanceof SyntaxError ? 'The message JSON is not valid JSON. Check its quotes, commas and brackets.' : error.message }; }
}

export function priceConversation(model, usage) {
  const calls = usage.calls.map(call => ({ ...call, ...estimateWorkload(model, { ok: true, inputTokens: call.inputTokens, outputTokens: call.outputTokens, calls: 1 }) }));
  return { calls, cost: calls.every(call => call.cost !== null) ? calls.reduce((sum, call) => sum + call.cost, 0) : null, pending: calls.some(call => call.pending) };
}

export function tokenCostReport(model, { mode, input = '', output = '', transcript = '', format = 'labels' }, estimateTokens) {
  const lines = ['SOFT CAT text-token cost estimate', `Model: ${model.name}`, `OpenRouter ID: ${model.id}`, `Input USD per million tokens: ${model.inputPrice}`, `Output USD per million tokens: ${model.outputPrice}`, `Price source: ${model.pricingSource}`, `Price checked UTC: ${model.pricingCheckedAt}`, ''];
  if (mode === 'conversation') {
    const parsed = parseCostTranscript(transcript, format, estimateTokens);
    if (!parsed.ok || !parsed.messages.length) throw new Error('A valid, non-empty transcript is required to export.');
    const priced = priceConversation(model, parsed.usage);
    lines.push(`Transcript format: ${format}`, `Repeated input tokens, estimated: ${parsed.usage.inputTokens}`, `Supplied output tokens, estimated: ${parsed.usage.outputTokens}`,
      `Total USD for supplied text: ${priced.cost ?? 'unavailable because a call exceeds a recorded limit or its data is unknown'}`,
      `Pending output omitted: ${priced.pending ? 'yes' : 'no'}`, '',
      ...priced.calls.map(call => `Call ${call.number}: ${call.inputTokens} input, ${call.pending ? 'unknown' : call.outputTokens} output, USD ${call.cost ?? 'unavailable'}, ${call.status}`), '', 'Original transcript:', transcript);
  } else {
    if (typeof input !== 'string' || typeof output !== 'string' || input.length > TOKEN_TEXT_LIMIT || output.length > TOKEN_TEXT_LIMIT || !input.trim()) throw new Error('A non-empty input within the size limit is required to export.');
    const inputTokens = estimateTokens(input), outputTokens = estimateTokens(output);
    const price = estimateWorkload(model, { ok: true, inputTokens, outputTokens, calls: 1 });
    lines.push(`Input tokens, estimated: ${inputTokens}`, `Output tokens, estimated: ${outputTokens}`, `Output supplied: ${output.length ? 'yes' : 'no, input-only estimate'}`, `Total USD for supplied text: ${price.cost ?? 'unavailable'}`, `Status: ${price.status}`, '', 'Input text:', input, '', 'Supplied output text:', output);
  }
  lines.push('', `Planning context tokens: ${contextLimit(model) ?? 'unknown'}`, `Output cap tokens: ${outputLimit(model) ?? 'unknown'}`, `Context reviewed UTC: ${model.context?.checkedAt ?? 'unknown'}`, 'Counts use a character heuristic, not the selected model tokenizer. Message formatting overhead is excluded.', 'Conversation calls resend all earlier system, user and assistant text. Caching, reasoning tokens, tools, images, audio, routing and other provider charges are excluded.', 'Missing output is omitted, not predicted to be free. These are planning estimates, not a usage bill.', 'https://softcat.ai/lab/token-cost', '');
  return lines.join('\n');
}
