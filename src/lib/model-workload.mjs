import { hasVerifiedPrice } from './model-pricing.mjs';
import { hasWeightRecord, weightLabel } from './model-weights.mjs';
import { contextLimit, outputLimit } from './model-context.mjs';

export function parseWorkload(input, output, calls) {
  const raw = [input, output, calls].map(value => String(value).trim());
  const values = raw.map(Number);
  if (raw.some(value => !/^\d+$/.test(value)) || values.some(value => !Number.isSafeInteger(value))) {
    return { ok: false, error: 'Use a whole number of zero or more in each field.' };
  }
  const [inputTokens, outputTokens, requests] = values;
  if (!Number.isSafeInteger(inputTokens + outputTokens) || !Number.isSafeInteger((inputTokens + outputTokens) * requests)) {
    return { ok: false, error: 'This workload is too large to calculate reliably. Reduce the token counts or calls.' };
  }
  return { ok: true, inputTokens, outputTokens, calls: requests };
}

export function estimateWorkload(model, workload) {
  if (!workload.ok) return { status: 'invalid-workload', cost: null };
  if (!hasVerifiedPrice(model)) return { status: 'unknown-price', cost: null };
  const context = contextLimit(model), output = outputLimit(model);
  if (context === null) return { status: 'unknown-context', cost: null };
  if (workload.inputTokens + workload.outputTokens > context) {
    return { status: 'above-saved-context', cost: null };
  }
  if (output !== null && workload.outputTokens > output) return { status: 'above-output-limit', cost: null };
  const cost = (workload.inputTokens * model.inputPrice + workload.outputTokens * model.outputPrice) * workload.calls / 1_000_000;
  return Number.isFinite(cost) ? { status: 'estimated', cost } : { status: 'invalid-workload', cost: null };
}

export function compareWorkloadRows(a, b, key, direction = 1) {
  const value = row => key === 'cost' ? row.estimate.cost
    : key === 'context' ? contextLimit(row.model)
    : ['inputPrice', 'outputPrice'].includes(key) ? (hasVerifiedPrice(row.model) ? row.model[key] : null)
    : row.model[key];
  const av = value(a), bv = value(b);
  if (av === null || bv === null) return av === bv ? a.model.name.localeCompare(b.model.name) : av === null ? 1 : -1;
  const order = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
  return order * direction || a.model.name.localeCompare(b.model.name);
}

export function workloadMoney(value) {
  if (value === 0) return '$0.00';
  if (value > 0 && value < 0.000001) return '<$0.000001';
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: value < 1 ? 6 : 4 });
}

// Quoting alone does not stop spreadsheet formula evaluation of text cells.
export function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function workloadCsv(rows, workload) {
  const header = ['Model', 'OpenRouter ID', 'Provider', 'Weight record', 'Planning context tokens', 'Input USD per 1M', 'Output USD per 1M', 'Pricing status', 'Pricing checked UTC', 'Pricing source', 'Input tokens per call', 'Output tokens per call', 'Calls', 'Estimate status', 'Estimated text-token USD', 'Weight source revision', 'Model card licence', 'Weight access', 'Weight source checked UTC', 'Catalogue context tokens', 'Top-provider context tokens', 'Top-provider output tokens', 'Context status', 'Context checked UTC', 'Context source'];
  const records = rows.map(({ model, estimate }) => [model.name, model.id, model.provider, weightLabel(model), contextLimit(model),
    hasVerifiedPrice(model) ? model.inputPrice : null, hasVerifiedPrice(model) ? model.outputPrice : null,
    model.pricingStatus, model.pricingCheckedAt, model.pricingSource,
    workload.ok ? workload.inputTokens : null, workload.ok ? workload.outputTokens : null, workload.ok ? workload.calls : null,
    estimate.status, estimate.cost, hasWeightRecord(model) ? model.weights.source : null,
    model.weights?.licence, model.weights?.access, model.weights?.checkedAt,
    model.context?.catalogueTokens, model.context?.providerTokens, model.context?.outputTokens,
    model.context?.status, model.context?.checkedAt, model.context?.source]);
  return [header, ...records].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
