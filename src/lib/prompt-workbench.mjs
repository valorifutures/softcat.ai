export const WORKBENCH_KEY = 'softcat-workbench';
export const HANDOFF_KEY = 'softcat-workbench-handoff-v2';
export const FIELD_LIMIT = 200_000;
export const LIBRARY_LIMIT = 5_000_000;
export const MAX_SAVED_PROMPTS = 500;
const variablePattern = /\{\{\s*([\w-]+)\s*\}\}/g;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

export function variableKeys(...fields) {
  return [...new Set(fields.flatMap((field) => [...field.matchAll(variablePattern)].map((match) => match[1])))];
}

export function fillPrompt(text, variables) {
  let output = '', cursor = 0;
  for (const match of text.matchAll(variablePattern)) {
    const key = match[1];
    const value = own(variables, key) && typeof variables[key] === 'string' && variables[key].trim() ? variables[key] : match[0];
    const prefix = text.slice(cursor, match.index);
    if (output.length + prefix.length + value.length > FIELD_LIMIT) throw new Error('A filled message exceeds 200,000 characters. Shorten the text or variables.');
    output += prefix + value;
    cursor = match.index + match[0].length;
  }
  if (output.length + text.length - cursor > FIELD_LIMIT) throw new Error('A filled message exceeds 200,000 characters. Shorten the text or variables.');
  return output + text.slice(cursor);
}

export function renderPrompt(prompt) {
  const keys = variableKeys(prompt.system, prompt.user, prompt.assistant);
  return {
    system: fillPrompt(prompt.system, prompt.vars),
    user: fillPrompt(prompt.user, prompt.vars),
    assistant: fillPrompt(prompt.assistant, prompt.vars),
    missing: keys.filter((key) => !own(prompt.vars, key) || typeof prompt.vars[key] !== 'string' || !prompt.vars[key].trim()),
  };
}

export function promptMessages(rendered) {
  return [
    ...(rendered.system ? [{ role: 'system', content: rendered.system }] : []),
    { role: 'user', content: rendered.user },
    ...(rendered.assistant ? [{ role: 'assistant', content: rendered.assistant }] : []),
  ];
}

export function requestBody(rendered, model) {
  if (!model || !/^[a-zA-Z0-9._:-]+\/[a-zA-Z0-9._:/-]+$/.test(model)) throw new Error('Choose a model before exporting a request.');
  if (rendered.missing.length) throw new Error('Fill every detected variable before exporting a request.');
  if (!rendered.user.trim()) throw new Error('Add a user message before exporting a request.');
  return { model, messages: promptMessages(rendered), max_tokens: 2048 };
}

export function shellQuote(text) {
  return "'" + text.replaceAll("'", "'\"'\"'") + "'";
}

export function curlRequest(body) {
  return ': "${OPENROUTER_API_KEY:?Set OPENROUTER_API_KEY before running}"\n' +
    'curl --fail-with-body https://openrouter.ai/api/v1/chat/completions \\\n' +
    '  --header "Authorization: Bearer ${OPENROUTER_API_KEY}" \\\n' +
    '  --header "Content-Type: application/json" \\\n' +
    '  --data-raw ' + shellQuote(JSON.stringify(body));
}

export function exportText(rendered) {
  return promptMessages(rendered).map((message) => `[${message.role === 'assistant' ? 'Assistant prefix' : message.role === 'system' ? 'System' : 'User'}]\n${message.content}`).join('\n\n');
}

function validatePrompt(value) {
  if (!record(value) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 160) throw new Error('A saved prompt needs a name of 1 to 160 characters.');
  for (const field of ['system', 'user', 'assistant']) {
    if (typeof value[field] !== 'string' || value[field].length > FIELD_LIMIT) throw new Error('A saved prompt has an invalid or oversized editor field.');
  }
  if (!record(value.vars) || Object.keys(value.vars).length > 500 || Object.entries(value.vars).some(([key, text]) => !/^[\w-]+$/.test(key) || typeof text !== 'string' || text.length > FIELD_LIMIT)) throw new Error('A saved prompt has invalid variables.');
  if (!Number.isFinite(value.timestamp) || value.timestamp < 0 || value.timestamp > 8.64e15) throw new Error('A saved prompt has an invalid date.');
  if (value.id !== undefined && (typeof value.id !== 'string' || !value.id || value.id.length > 160)) throw new Error('A saved prompt has an invalid ID.');
  if (value.model !== undefined && (typeof value.model !== 'string' || value.model.length > 200)) throw new Error('A saved prompt has an invalid model ID.');
  return value;
}

export function parsePromptLibrary(raw) {
  if (raw === null) return [];
  if (typeof raw !== 'string' || raw.length > LIBRARY_LIMIT || new TextEncoder().encode(raw).byteLength > LIBRARY_LIMIT) throw new Error('The saved library is too large to open here.');
  let value;
  try { value = JSON.parse(raw); } catch { throw new Error('The saved library is not valid JSON.'); }
  const prompts = Array.isArray(value) ? value : record(value) && value.version === 1 ? value.prompts : null;
  if (!Array.isArray(prompts) || prompts.length > MAX_SAVED_PROMPTS) throw new Error('Expected a prompt library with no more than 500 entries.');
  prompts.forEach(validatePrompt);
  const ids = prompts.filter((prompt) => prompt.id).map((prompt) => prompt.id);
  if (new Set(ids).size !== ids.length) throw new Error('The saved library contains duplicate prompt IDs.');
  return prompts;
}

export function writePromptLibrary(storage, expectedRaw, prompts) {
  const raw = JSON.stringify(prompts);
  parsePromptLibrary(raw);
  if (storage.getItem(WORKBENCH_KEY) !== expectedRaw) throw new Error('Saved prompts changed in another tab. Reload the saved library before trying again. Your editor has been kept.');
  storage.setItem(WORKBENCH_KEY, raw);
  return raw;
}

export function parseWorkbenchHandoff(raw, now = Date.now()) {
  if (typeof raw !== 'string' || raw.length > LIBRARY_LIMIT) return null;
  try {
    const value = JSON.parse(raw);
    if (!record(value) || value.version !== 2 || !Number.isFinite(value.createdAt) || now - value.createdAt > 30 * 60_000 || value.createdAt > now + 60_000) return null;
    if (typeof value.system !== 'string' || typeof value.user !== 'string' || typeof value.model !== 'string' || !value.user.trim()) return null;
    if (value.system.length > FIELD_LIMIT || value.user.length > FIELD_LIMIT || value.model.length > 200) return null;
    return { system: value.system, user: value.user, model: value.model };
  } catch { return null; }
}
