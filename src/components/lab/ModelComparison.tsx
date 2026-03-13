import { useState } from 'preact/hooks';
import modelsData from '../../data/models.json';

interface Model {
  name: string;
  provider: string;
  contextK: number;
  inputPrice: number;
  outputPrice: number;
  openSource: boolean;
  released: string;
  strengths: string;
  coding: number;
  reasoning_score: number;
  speed: number;
}

const models: Model[] = modelsData as Model[];

const ctxDisplay = (k: number) => k >= 1000 ? `${k / 1000}M` : `${k}K`;
const priceDisplay = (p: number) => p === 0 ? 'Free*' : `$${p}`;

type SortKey = 'name' | 'provider' | 'contextK' | 'inputPrice' | 'coding' | 'reasoning_score' | 'speed';

function MiniBar({ score, color }: { score: number; color: string }) {
  return (
    <div class="flex items-center gap-1.5">
      <div class="w-16 h-1 bg-surface-light rounded-full overflow-hidden">
        <div class={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span class="font-mono text-xs text-text-muted">{score}</span>
    </div>
  );
}

export default function ModelComparison() {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const providers = [...new Set(models.map((m) => m.provider))].sort();

  const filtered = models
    .filter((m) => {
      if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.strengths.toLowerCase().includes(search.toLowerCase())) return false;
      if (providerFilter !== 'all' && m.provider !== providerFilter) return false;
      if (sourceFilter === 'open' && !m.openSource) return false;
      if (sourceFilter === 'closed' && m.openSource) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortBy === 'contextK' || sortBy === 'inputPrice' || sortBy === 'coding' || sortBy === 'reasoning_score' || sortBy === 'speed') return (a[sortBy] - b[sortBy]) * dir;
      return a[sortBy].localeCompare(b[sortBy]) * dir;
    });

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc);
    else { setSortBy(key); setSortAsc(true); }
  };

  const sortIcon = (key: SortKey) => sortBy === key ? (sortAsc ? ' ↑' : ' ↓') : '';

  return (
    <div class="space-y-4">
      {/* Filters */}
      <div class="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          placeholder="Search models..."
          class="bg-surface border border-surface-light rounded px-3 py-1.5 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50 w-48"
        />
        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter((e.target as HTMLSelectElement).value)}
          class="bg-surface border border-surface-light rounded px-3 py-1.5 font-mono text-sm text-text-primary focus:outline-none focus:border-neon-green/50"
        >
          <option value="all">All providers</option>
          {providers.map((p) => <option value={p}>{p}</option>)}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter((e.target as HTMLSelectElement).value)}
          class="bg-surface border border-surface-light rounded px-3 py-1.5 font-mono text-sm text-text-primary focus:outline-none focus:border-neon-green/50"
        >
          <option value="all">All models</option>
          <option value="open">Open source</option>
          <option value="closed">Closed source</option>
        </select>
      </div>

      {/* Table */}
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-surface-light">
              <th class="py-2 px-3 font-mono text-xs text-text-muted cursor-pointer hover:text-neon-cyan" onClick={() => toggleSort('name')}>Model{sortIcon('name')}</th>
              <th class="py-2 px-3 font-mono text-xs text-text-muted cursor-pointer hover:text-neon-cyan" onClick={() => toggleSort('provider')}>Provider{sortIcon('provider')}</th>
              <th class="py-2 px-3 font-mono text-xs text-text-muted cursor-pointer hover:text-neon-cyan" onClick={() => toggleSort('contextK')}>Context{sortIcon('contextK')}</th>
              <th class="py-2 px-3 font-mono text-xs text-text-muted">Input /1M</th>
              <th class="py-2 px-3 font-mono text-xs text-text-muted">Output /1M</th>
              <th class="py-2 px-3 font-mono text-xs text-text-muted cursor-pointer hover:text-neon-cyan" onClick={() => toggleSort('coding')}>Coding{sortIcon('coding')}</th>
              <th class="py-2 px-3 font-mono text-xs text-text-muted cursor-pointer hover:text-neon-cyan" onClick={() => toggleSort('reasoning_score')}>Reasoning{sortIcon('reasoning_score')}</th>
              <th class="py-2 px-3 font-mono text-xs text-text-muted cursor-pointer hover:text-neon-cyan" onClick={() => toggleSort('speed')}>Speed{sortIcon('speed')}</th>
              <th class="py-2 px-3 font-mono text-xs text-text-muted">Strengths</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr class="border-b border-surface-light/30 hover:bg-surface-light/20 transition-colors">
                <td class="py-2.5 px-3 font-mono text-sm text-text-bright">
                  {m.name}
                  {m.openSource && <span class="ml-2 text-xs text-neon-green">OSS</span>}
                </td>
                <td class="py-2.5 px-3 font-mono text-sm text-text-muted">{m.provider}</td>
                <td class="py-2.5 px-3 font-mono text-sm text-neon-cyan">{ctxDisplay(m.contextK)}</td>
                <td class="py-2.5 px-3 font-mono text-sm text-text-primary">{priceDisplay(m.inputPrice)}</td>
                <td class="py-2.5 px-3 font-mono text-sm text-text-primary">{priceDisplay(m.outputPrice)}</td>
                <td class="py-2.5 px-3"><MiniBar score={m.coding} color="bg-neon-green" /></td>
                <td class="py-2.5 px-3"><MiniBar score={m.reasoning_score} color="bg-neon-cyan" /></td>
                <td class="py-2.5 px-3"><MiniBar score={m.speed} color="bg-neon-amber" /></td>
                <td class="py-2.5 px-3 text-sm text-text-muted max-w-xs">{m.strengths}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p class="font-mono text-xs text-text-muted">
        {filtered.length} of {models.length} models shown. Prices per 1M tokens (USD). *Open source models are free to self-host.
      </p>
    </div>
  );
}
