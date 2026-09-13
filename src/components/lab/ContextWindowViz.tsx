import { useState } from 'preact/hooks';
import { assessContext, budgetFields, contextLimit, outputLimit, contextReport, contextStatus, parseContextBudget } from '../../lib/model-context.mjs';
import './ContextWindowViz.css';

type Model = { id: string; name: string; provider: string; context: { status: string; catalogueTokens: number | null; providerTokens: number | null; outputTokens: number | null; checkedAt: string; source: string } };
type Counts = Record<string, string>;
const presets: { name: string; counts: Counts }[] = [
  { name: 'Document question', counts: { system: '1000', history: '4000', documents: '10000', tools: '1000', output: '2000', headroom: '1000' } },
  { name: 'Large code review', counts: { system: '2000', history: '12000', documents: '240000', tools: '4000', output: '8000', headroom: '8000' } },
  { name: 'Long reply', counts: { system: '1000', history: '2000', documents: '10000', tools: '0', output: '70000', headroom: '2000' } },
];
const fmt = (value: number | null | undefined) => value == null ? 'Unknown' : value.toLocaleString('en-GB');
const date = (value: string) => new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';

export default function ContextWindowViz({ models }: { models: Model[] }) {
  const [counts, setCounts] = useState<Counts>({ ...presets[0].counts });
  const [selectedId, setSelectedId] = useState(models.find(model => model.id === 'anthropic/claude-sonnet-4')?.id ?? models[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const model = models.find(item => item.id === selectedId);
  const budget = parseContextBudget(counts);
  if (!model) return <p>No reviewed model records are available.</p>;
  const result = assessContext(model, budget);
  const rows = models.filter(item => `${item.id} ${item.name} ${item.provider}`.toLowerCase().includes(query.trim().toLowerCase()))
    .map(item => ({ model: item, result: assessContext(item, budget) }))
    .sort((a, b) => (contextLimit(a.model) ?? Infinity) - (contextLimit(b.model) ?? Infinity) || a.model.name.localeCompare(b.model.name));
  const copy = async () => {
    try { await navigator.clipboard.writeText(contextReport(model, budget)); setNotice('Copied the budget, limits and dated source.'); }
    catch { setNotice('Copy was unavailable. Download the plan to keep the same record.'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([contextReport(model, budget)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'softcat-context-budget.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Downloaded the budget with its assumptions and source.');
  };
  return <div class="context-budget">
    <section aria-labelledby="cb-input-title" class="cb-input">
      <div class="cb-section-title"><div><p class="eyebrow">01 / COUNT THE WHOLE REQUEST</p><h2 id="cb-input-title">What needs to fit?</h2></div><span>Local calculation · no API call</span></div>
      <p class="cb-help" id="cb-count-help">Enter token counts from your tokenizer or API usage. Include messages sent again on this call. The examples are illustrative workloads.</p>
      <div class="cb-presets">{presets.map(preset => <button type="button" onClick={() => { setCounts({ ...preset.counts }); setNotice(''); }}>{preset.name}</button>)}<button type="button" onClick={() => { setCounts(Object.fromEntries(budgetFields.map(field => [field.key, '0']))); setNotice(''); }}>Clear counts</button></div>
      <div class="cb-fields">{budgetFields.map(field => <label><span><i style={{ background: field.colour }} aria-hidden="true" />{field.label}</span><input type="number" min="0" step="1" inputMode="numeric" value={counts[field.key]} onInput={event => { setCounts({ ...counts, [field.key]: event.currentTarget.value }); setNotice(''); }} aria-invalid={!budget.ok} aria-describedby={budget.ok ? 'cb-count-help' : 'cb-error'} /></label>)}</div>
      {!budget.ok && <p id="cb-error" role="alert" class="cb-error">{budget.error}</p>}
      <p class="cb-help">Reply allowance reserves space for the output. Extra headroom leaves space unused for message formatting or uncertain counts. It is your planning margin, not extra billable input.</p>
    </section>

    <section class="cb-summary" aria-labelledby="cb-result-title">
      <p class="eyebrow">02 / CHECK A RECORDED LIMIT</p>
      <label class="cb-model-label">Model<select value={selectedId} onChange={event => { setSelectedId(event.currentTarget.value); setNotice(''); }}>{models.map(item => <option value={item.id}>{item.name} · {item.provider}</option>)}</select></label>
      <p class="cb-model-id">{model.id}</p>
      <div class="cb-result-heading"><h2 id="cb-result-title">{budget.ok ? fmt(budget.total) : 'Check counts'}<span>tokens to make room for</span></h2><p class={`cb-status cb-status-${result.status}`} role="status">{contextStatus[result.status]}</p></div>
      {budget.ok && result.limit !== null && <>
        <div class="cb-capacity" aria-hidden="true">{budgetFields.map(field => <span style={{ width: `${budget.counts[field.key] / Math.max(budget.total, result.limit) * 100}%`, background: field.colour }} />)}</div>
        <p class="cb-bar-caption">The bar represents {budget.total > result.limit ? 'the full requested budget, which exceeds the recorded capacity' : 'the recorded capacity, with unused space at the right'}.</p>
        <dl class="cb-totals"><div><dt>Input</dt><dd>{fmt(budget.input)}</dd></div><div><dt>Reply allowance</dt><dd>{fmt(budget.counts.output)}</dd></div><div><dt>Extra headroom</dt><dd>{fmt(budget.counts.headroom)}</dd></div><div><dt>{result.excess > 0 ? 'Over capacity' : 'Still available'}</dt><dd>{fmt(result.excess > 0 ? result.excess : result.remaining)}</dd></div></dl>
        {result.excess > 0 && <p class="cb-result-note">Remove at least {fmt(result.excess)} tokens from this budget, split the request or inspect a model with a larger recorded limit.</p>}
        {result.outputExcess > 0 && <p class="cb-result-note">The reply allowance is {fmt(result.outputExcess)} tokens above the recorded output cap. More unused context does not raise that cap.</p>}
      </>}
      {budget.ok && result.limit === null && <p class="cb-result-note">This model has no usable context quote in the checked catalogue. An empty request does not turn missing data into a known limit.</p>}
      <dl class="cb-source-values"><div><dt>Planning context limit</dt><dd>{fmt(contextLimit(model))}</dd></div><div><dt>Catalogue context quote</dt><dd>{fmt(model.context.catalogueTokens)}</dd></div><div><dt>Top-provider context quote</dt><dd>{fmt(model.context.providerTokens)}</dd></div><div><dt>Top-provider output cap</dt><dd>{fmt(outputLimit(model))}</dd></div></dl>
      <p class="cb-source-note">All limits are in tokens. When the two context quotes differ, this tool uses the smaller known figure. An unknown output cap remains unknown.</p>
      <p class="cb-source-note"><a href={model.context.source}>OpenRouter catalogue ↗</a> · Checked <time dateTime={model.context.checkedAt}>{date(model.context.checkedAt)}</time></p>
      <div class="cb-actions"><button type="button" disabled={!budget.ok} onClick={copy}>Copy plan</button><button type="button" disabled={!budget.ok} onClick={download}>Download plan ↓</button></div><p class="cb-notice" role="status">{notice}</p>
    </section>

    <details class="cb-comparison"><summary>The same request across {models.length} models <span>Compare limits ↗</span></summary><div>
      <p class="cb-help">Every row uses the counts above. Limits come from the same dated review. Model names are labels, so use the exact ID when configuring a request.</p>
      <label class="cb-search">Find a model<input type="search" value={query} placeholder="Name, provider or exact ID" onInput={event => setQuery(event.currentTarget.value)} /></label>
      <p class="cb-help" role="status">{rows.length} matching {rows.length === 1 ? 'model' : 'models'}.</p>
      {rows.length > 0 ? <div class="cb-table-wrap" tabIndex={0} role="region" aria-label="Context comparison table"><table><caption>All limits and budgets are in tokens.</caption><thead><tr><th scope="col">Model</th><th scope="col">Planning context</th><th scope="col">Output cap</th><th scope="col">Your budget</th></tr></thead><tbody>{rows.map(row => <tr><th scope="row">{row.model.name}<span>{row.model.id}</span></th><td>{fmt(contextLimit(row.model))}</td><td>{fmt(outputLimit(row.model))}</td><td>{contextStatus[row.result.status]}</td></tr>)}</tbody></table></div> : <p class="cb-help">No models match. Try a shorter name or clear the search.</p>}
    </div></details>
    <aside class="cb-limits"><h2>Capacity is only one constraint.</h2><p>A request can fit and still produce a poor answer. This checks recorded capacity, not retrieval quality, recall or live request acceptance. Provider routes, access tiers, image and audio accounting, and reasoning-token rules can differ.</p><p>The token counts are your inputs, not measurements made by this page. Reserve space for any hidden reasoning that counts towards the provider's output limit. For price estimates, use <a href="/lab/model-comparison">Model Comparison</a>. It uses the same reviewed context and output limits.</p><p><a href="https://github.com/valorifutures/softcat.ai/blob/main/src/data/model-context-review.json">Inspect the dated review and source fingerprint ↗</a></p></aside>
  </div>;
}
