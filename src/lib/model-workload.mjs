import { hasVerifiedPrice } from './model-pricing.mjs';

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
  if (!(model.contextK > 0)) return { status: 'unknown-context', cost: null };
  if (workload.inputTokens + workload.outputTokens > model.contextK * 1000) {
    return { status: 'above-saved-context', cost: null };
  }
  const cost = (workload.inputTokens * model.inputPrice + workload.outputTokens * model.outputPrice) * workload.calls / 1_000_000;
  return Number.isFinite(cost) ? { status: 'estimated', cost } : { status: 'invalid-workload', cost: null };
}

export function compareWorkloadRows(a, b, key, direction = 1) {
  const value = row => key === 'cost' ? row.estimate.cost
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
  const header = ['Model', 'OpenRouter ID', 'Provider', 'Weight tag (reference)', 'Saved context tokens', 'Input USD per 1M', 'Output USD per 1M', 'Pricing status', 'Pricing checked UTC', 'Pricing source', 'Input tokens per call', 'Output tokens per call', 'Calls', 'Estimate status', 'Estimated text-token USD'];
  const records = rows.map(({ model, estimate }) => [model.name, model.id, model.provider, model.openSource ? 'Open weights' : 'Closed weights', model.contextK * 1000,
    hasVerifiedPrice(model) ? model.inputPrice : null, hasVerifiedPrice(model) ? model.outputPrice : null,
    model.pricingStatus, model.pricingCheckedAt, model.pricingSource,
    workload.ok ? workload.inputTokens : null, workload.ok ? workload.outputTokens : null, workload.ok ? workload.calls : null,
    estimate.status, estimate.cost]);
  return [header, ...records].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
