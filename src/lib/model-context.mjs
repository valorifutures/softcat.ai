export const CONTEXT_SOURCE = 'https://openrouter.ai/api/v1/models';
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;

export function contextRecordFromCatalogue(entry, checkedAt) {
  const record = {
    status: !entry ? 'not-listed' : positiveInteger(entry.context_length) ? 'reported' : 'unverified',
    catalogueTokens: positiveInteger(entry?.context_length) ? entry.context_length : null,
    providerTokens: positiveInteger(entry?.top_provider?.context_length) ? entry.top_provider.context_length : null,
    outputTokens: positiveInteger(entry?.top_provider?.max_completion_tokens) ? entry.top_provider.max_completion_tokens : null,
    checkedAt, source: CONTEXT_SOURCE,
  };
  return record;
}

export function contextRecordErrors(model, now = Date.now()) {
  const record = model?.context;
  if (!record || typeof record !== 'object') return ['A reviewed context record is required.'];
  const errors = [];
  if (!['reported', 'not-listed', 'unverified'].includes(record.status)) errors.push('Invalid context status.');
  for (const field of ['catalogueTokens', 'providerTokens', 'outputTokens']) {
    if (record[field] !== null && !positiveInteger(record[field])) errors.push(`${field} must be a positive safe integer or null.`);
  }
  if (record.status === 'reported' && !positiveInteger(record.catalogueTokens)) errors.push('A reported context needs a catalogue limit.');
  if (record.status === 'not-listed' && ['catalogueTokens', 'providerTokens', 'outputTokens'].some(key => record[key] !== null)) errors.push('Unlisted context limits must be unknown.');
  if (record.source !== CONTEXT_SOURCE) errors.push('The context source must identify the catalogue.');
  if (typeof record.checkedAt !== 'string' || !Number.isFinite(Date.parse(record.checkedAt)) || Date.parse(record.checkedAt) > now + 60_000) errors.push('The context check needs a valid, non-future timestamp.');
  return errors;
}

// The catalogue and its top-provider entry can disagree. Retain both quotes
// and use the smaller known limit. Neither establishes a route's live limits.
export function contextLimit(model) {
  const record = model?.context;
  if (record?.status !== 'reported' || !positiveInteger(record.catalogueTokens)) return null;
  return Math.min(record.catalogueTokens, positiveInteger(record.providerTokens) ? record.providerTokens : record.catalogueTokens);
}

export function outputLimit(model) {
  return model?.context?.status === 'reported' && positiveInteger(model.context.outputTokens) ? model.context.outputTokens : null;
}

export const budgetFields = [
  { key: 'system', label: 'System instructions', colour: '#cde4aa' },
  { key: 'history', label: 'Conversation history', colour: '#a9c7de' },
  { key: 'documents', label: 'Documents and new input', colour: '#d9bc93' },
  { key: 'tools', label: 'Tool definitions and results', colour: '#c5b3db' },
  { key: 'output', label: 'Reply allowance', colour: '#e5a99f' },
  { key: 'headroom', label: 'Extra headroom', colour: '#81957c' },
];

export function parseContextBudget(values) {
  const counts = {};
  for (const { key } of budgetFields) {
    const raw = String(values?.[key] ?? '').trim();
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) return { ok: false, error: 'Use a whole number of zero or more in every field.' };
    counts[key] = Number(raw);
  }
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  if (!Number.isSafeInteger(total)) return { ok: false, error: 'The total is too large to calculate reliably. Reduce the counts.' };
  return { ok: true, counts, input: counts.system + counts.history + counts.documents + counts.tools, total, request: total - counts.headroom };
}

export function assessContext(model, budget) {
  if (!budget.ok) return { status: 'invalid', limit: null, outputLimit: null };
  const limit = contextLimit(model), output = outputLimit(model);
  if (limit === null) return { status: 'unknown', limit: null, outputLimit: output };
  const excess = Math.max(0, budget.total - limit);
  const outputExcess = output === null ? null : Math.max(0, budget.counts.output - output);
  return {
    status: excess > 0 ? 'over-context' : outputExcess > 0 ? 'over-output' : output === null ? 'output-unknown' : 'within',
    limit, outputLimit: output, remaining: Math.max(0, limit - budget.total), excess, outputExcess,
  };
}

export const contextStatus = {
  invalid: 'Check the token counts', unknown: 'Context unknown', 'over-context': 'Over context budget',
  'over-output': 'Reply exceeds output limit', 'output-unknown': 'Context fits, output limit unknown', within: 'Within recorded limits',
};

export function contextReport(model, budget) {
  if (!budget.ok) throw new Error('A valid budget is required to export.');
  const result = assessContext(model, budget);
  return [
    'SOFT CAT context budget', `Model: ${model.name}`, `OpenRouter ID: ${model.id}`, '',
    ...budgetFields.map(field => `${field.label}: ${budget.counts[field.key]} tokens`),
    `Input: ${budget.input} tokens`, `Total including reply and headroom: ${budget.total} tokens`, '',
    `Result: ${contextStatus[result.status]}`, `Planning context limit: ${result.limit ?? 'unknown'} tokens`,
    `Catalogue context: ${model.context.catalogueTokens ?? 'unknown'} tokens`,
    `Top-provider context: ${model.context.providerTokens ?? 'unknown'} tokens`,
    `Top-provider output limit: ${result.outputLimit ?? 'unknown'} tokens`,
    `Source: ${model.context.source}`, `Checked UTC: ${model.context.checkedAt}`, '',
    'Whole-token planning counts supplied by the visitor. Extra headroom is unused capacity, not billable input.',
    'The smaller reported context limit is used when catalogue and top-provider limits differ.',
    'This checks recorded capacity, not answer quality or live request acceptance. Routes, tiers and reasoning-token rules can differ.',
    'https://softcat.ai/lab/context-window', '',
  ].join('\n');
}
