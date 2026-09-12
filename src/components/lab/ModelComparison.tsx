import { useState } from 'preact/hooks';
import { hasVerifiedPrice, priceLabel } from '../../lib/model-pricing.mjs';
import { parseWorkload, estimateWorkload, compareWorkloadRows, workloadMoney, workloadCsv } from '../../lib/model-workload.mjs';
import modelsData from '../../data/models.json';
import './ModelComparison.css';

type SortKey = 'name' | 'contextK' | 'inputPrice' | 'outputPrice' | 'cost';
const presets = [
  { name: 'Short replies', input: '500', output: '150', calls: '1000' },
  { name: 'Document summaries', input: '12000', output: '800', calls: '1000' },
  { name: 'Long conversations', input: '40000', output: '2000', calls: '1000' },
];
const providers = [...new Set(modelsData.map(model => model.provider))].sort();
const contextLabel = (k: number) => k > 0 ? (k >= 1000 ? `${k / 1000}M` : `${k}K`) : 'Unknown';
const statusLabels: Record<string, string> = {
  'invalid-workload': 'Check the workload', 'unknown-price': 'Price unknown',
  'unknown-context': 'Saved context unknown', 'above-saved-context': 'Above saved context',
};

export default function ModelComparison() {
  const [input, setInput] = useState('1000');
  const [output, setOutput] = useState('500');
  const [calls, setCalls] = useState('1000');
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('all');
  const [weights, setWeights] = useState('all');
  const [sort, setSort] = useState<SortKey>('cost');
  const [ascending, setAscending] = useState(true);
  const [notice, setNotice] = useState('');
  const workload = parseWorkload(input, output, calls);
  const query = search.trim().toLowerCase();
  const rows = modelsData.filter(model =>
    (!query || `${model.name} ${model.id} ${model.provider}`.toLowerCase().includes(query)) &&
    (provider === 'all' || model.provider === provider) &&
    (weights === 'all' || model.openSource === (weights === 'open'))
  ).map(model => ({ model, estimate: estimateWorkload(model, workload) }))
    .sort((a, b) => compareWorkloadRows(a, b, sort, ascending ? 1 : -1));
  const estimatedCount = rows.filter(row => row.estimate.cost !== null).length;

  const sortBy = (key: SortKey) => { if (key === sort) setAscending(!ascending); else { setSort(key); setAscending(true); } };
  const column = (key: SortKey, label: string) => <th scope="col" aria-sort={sort === key ? ascending ? 'ascending' : 'descending' : 'none'}>
    <button type="button" onClick={() => sortBy(key)}>{label}<span aria-hidden="true">{sort === key ? ascending ? ' ↑' : ' ↓' : ' ↕'}</span></button>
  </th>;
  const resetFilters = () => { setSearch(''); setProvider('all'); setWeights('all'); };
  const copyId = async (id: string) => {
    try { await navigator.clipboard.writeText(id); setNotice(`Copied ${id}`); }
    catch { setNotice('Copy was unavailable. Select the model ID in the table to copy it.'); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF', workloadCsv(rows, workload)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'softcat-model-workload.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`Exported ${rows.length} models with workload assumptions and pricing sources.`);
  };

  return <div class="model-comparison">
    <section class="model-workload" aria-labelledby="workload-title">
      <div class="model-workload-heading"><div><p class="model-eyebrow">01 / SET A WORKLOAD</p><h2 id="workload-title">What would your calls cost?</h2></div><span class="model-local">Calculated here · no API call</span></div>
      <div class="model-workload-fields">
        <label>Input tokens per call<input type="number" min="0" step="1" inputMode="numeric" value={input} onInput={event => setInput(event.currentTarget.value)} aria-describedby={!workload.ok ? 'workload-error' : 'workload-help'} aria-invalid={!workload.ok} /></label>
        <label>Output tokens per call<input type="number" min="0" step="1" inputMode="numeric" value={output} onInput={event => setOutput(event.currentTarget.value)} aria-describedby={!workload.ok ? 'workload-error' : 'workload-help'} aria-invalid={!workload.ok} /></label>
        <label>Number of calls<input type="number" min="0" step="1" inputMode="numeric" value={calls} onInput={event => setCalls(event.currentTarget.value)} aria-describedby={!workload.ok ? 'workload-error' : 'workload-help'} aria-invalid={!workload.ok} /></label>
      </div>
      {!workload.ok && <p id="workload-error" class="model-workload-error" role="alert">{workload.error}</p>}
      <div class="model-presets"><span>Illustrative presets</span>{presets.map(preset => <button type="button" key={preset.name} onClick={() => { setInput(preset.input); setOutput(preset.output); setCalls(preset.calls); }}>{preset.name}</button>)}</div>
      <p id="workload-help">Every call uses the same counts. Include the system prompt, tools and any repeated conversation history in the input. For a growing conversation, use the <a href="/lab/token-cost">turn-by-turn calculator</a>.</p>
    </section>

    <section class="model-results" aria-labelledby="model-results-title">
      <div class="model-results-heading"><div><p class="model-eyebrow">02 / COMPARE THE SNAPSHOTS</p><h2 id="model-results-title">A price is a starting point.</h2></div><button type="button" class="model-export" disabled={!workload.ok || !rows.length} onClick={download}>Export comparison <span aria-hidden="true">↓</span></button></div>
      <p class="model-explanation">These are recorded OpenRouter text-token rates, in USD. Try the models on your own examples before choosing one. Cost does not measure answer quality.</p>
      <div class="model-filters">
        <label>Find a model<input type="search" placeholder="Name, provider or exact model ID" value={search} onInput={event => setSearch(event.currentTarget.value)} /></label>
        <label>Provider<select value={provider} onChange={event => setProvider(event.currentTarget.value)}><option value="all">All providers</option>{providers.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
        <label>Weight tag<select value={weights} onChange={event => setWeights(event.currentTarget.value)}><option value="all">All models</option><option value="open">Open weights</option><option value="closed">Closed weights</option></select></label>
      </div>
      <p class="model-count" aria-live="polite">{rows.length} of {modelsData.length} models shown. {workload.ok ? `${estimatedCount} have an estimate for this workload.` : 'Enter a valid workload to calculate estimates.'}</p>
      {rows.length ? <>
        <p class="model-scroll-hint">Scroll the table sideways on smaller screens. Select a column heading to sort.</p>
        <div class="model-table-scroll" role="region" aria-label="Model comparison table, scroll horizontally for all columns" tabIndex={0}>
          <table><caption class="sr-only">Recorded model rates and estimated workload costs. All amounts are US dollars. Saved context is reference data.</caption><thead><tr>
            {column('name', 'Model')}{column('contextK', 'Saved context')}{column('inputPrice', 'Input / 1M')}{column('outputPrice', 'Output / 1M')}{column('cost', 'Workload cost')}<th scope="col">Price snapshot</th>
          </tr></thead><tbody>{rows.map(({ model, estimate }) => <tr key={model.id}>
            <th scope="row"><strong>{model.name}</strong><span class="model-provider">{model.provider} · {model.openSource ? 'Open weights' : 'Closed weights'}</span><div class="model-id"><code>{model.id}</code><button type="button" aria-label={`Copy ID for ${model.name}`} onClick={() => copyId(model.id)}>Copy ID</button></div></th>
            <td class="model-number">{contextLabel(model.contextK)}</td><td class="model-number">{priceLabel(model, 'inputPrice')}</td><td class="model-number">{priceLabel(model, 'outputPrice')}</td>
            <td class="model-estimate">{estimate.cost === null ? <span class="model-unavailable">{statusLabels[estimate.status]}</span> : <strong>{workloadMoney(estimate.cost)}</strong>}</td>
            <td class="model-snapshot"><time dateTime={model.pricingCheckedAt}>{model.pricingCheckedAt.slice(0, 10)}</time><span>{hasVerifiedPrice(model) ? 'Rates checked' : model.pricingStatus.replaceAll('-', ' ')}</span><a href={model.pricingSource}>Source ↗</a></td>
          </tr>)}</tbody></table>
        </div>
      </> : <div class="model-empty"><h3>No models match these filters.</h3><p>Try a shorter name or return to the full tracked list.</p><button type="button" onClick={resetFilters}>Clear filters</button></div>}
      <p class="model-limit-note">Input plus output must fit the saved context to show an estimate. Context limits and weight tags are reference values. Check the provider's current limits, maximum output and licence. An open-weight tag does not certify an open-source licence.</p>
      <p class="model-limit-note">Caching, reasoning tokens, images, tools, routing and long-context pricing can change the bill. Unknown rates stay unknown, including for zero calls. Open weights do not make hosted calls or hardware free.</p>
      <p class="model-action-notice" role="status">{notice}</p>
    </section>
  </div>;
}
