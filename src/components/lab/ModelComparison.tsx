import { useState } from 'preact/hooks';

interface Model {
  name: string;
  provider: string;
  contextWindow: string;
  contextK: number;
  inputPrice: string;
  outputPrice: string;
  openSource: boolean;
  released: string;
  strengths: string;
}

const models: Model[] = [
  // Anthropic
  { name: 'Claude Opus 4.6', provider: 'Anthropic', contextWindow: '200K', contextK: 200, inputPrice: '$5', outputPrice: '$25', openSource: false, released: '2026-02', strengths: 'Most capable Claude, complex reasoning, agentic tasks' },
  { name: 'Claude Sonnet 4.5', provider: 'Anthropic', contextWindow: '200K', contextK: 200, inputPrice: '$3', outputPrice: '$15', openSource: false, released: '2025-10', strengths: 'Near-Opus intelligence at Sonnet pricing' },
  { name: 'Claude Haiku 4.5', provider: 'Anthropic', contextWindow: '200K', contextK: 200, inputPrice: '$1', outputPrice: '$5', openSource: false, released: '2025-10', strengths: 'Speed, cost efficiency, high volume' },
  // OpenAI
  { name: 'GPT-5', provider: 'OpenAI', contextWindow: '400K', contextK: 400, inputPrice: '$1.25', outputPrice: '$10', openSource: false, released: '2025-11', strengths: 'Massive context, strong all-rounder' },
  { name: 'GPT-5 Mini', provider: 'OpenAI', contextWindow: '400K', contextK: 400, inputPrice: '$0.25', outputPrice: '$2', openSource: false, released: '2025-11', strengths: 'Budget GPT-5 class, large context' },
  { name: 'GPT-5 Nano', provider: 'OpenAI', contextWindow: '400K', contextK: 400, inputPrice: '$0.05', outputPrice: '$0.40', openSource: false, released: '2025-08', strengths: 'Cheapest frontier model, on-device capable' },
  { name: 'GPT-4.1', provider: 'OpenAI', contextWindow: '1M', contextK: 1000, inputPrice: '$2', outputPrice: '$8', openSource: false, released: '2025-04', strengths: 'Million-token context, coding, instruction following' },
  { name: 'GPT-4o', provider: 'OpenAI', contextWindow: '128K', contextK: 128, inputPrice: '$2.50', outputPrice: '$10', openSource: false, released: '2024-05', strengths: 'Multimodal, general purpose' },
  { name: 'o3', provider: 'OpenAI', contextWindow: '200K', contextK: 200, inputPrice: '$2', outputPrice: '$8', openSource: false, released: '2025-04', strengths: 'Reasoning, maths, science, coding' },
  { name: 'o3-mini', provider: 'OpenAI', contextWindow: '200K', contextK: 200, inputPrice: '$1.10', outputPrice: '$4.40', openSource: false, released: '2025-01', strengths: 'Budget reasoning model, structured thinking' },
  // Google
  { name: 'Gemini 2.5 Pro', provider: 'Google', contextWindow: '1M', contextK: 1000, inputPrice: '$1.25', outputPrice: '$10', openSource: false, released: '2025-03', strengths: 'Thinking model, coding, huge context' },
  { name: 'Gemini 2.5 Flash', provider: 'Google', contextWindow: '1M', contextK: 1000, inputPrice: '$0.15', outputPrice: '$0.60', openSource: false, released: '2025-04', strengths: 'Cheap thinking model, massive context' },
  { name: 'Gemini 2.0 Flash', provider: 'Google', contextWindow: '1M', contextK: 1000, inputPrice: '$0.10', outputPrice: '$0.40', openSource: false, released: '2025-02', strengths: 'Rock-bottom pricing, speed, multimodal' },
  // Meta
  { name: 'Llama 4 Scout', provider: 'Meta', contextWindow: '10M', contextK: 10000, inputPrice: 'Free*', outputPrice: 'Free*', openSource: true, released: '2025-04', strengths: '10M context, MoE architecture, self-hostable' },
  { name: 'Llama 4 Maverick', provider: 'Meta', contextWindow: '1M', contextK: 1000, inputPrice: 'Free*', outputPrice: 'Free*', openSource: true, released: '2025-04', strengths: 'Strong open-source, 1M context, multimodal' },
  // DeepSeek
  { name: 'DeepSeek V3', provider: 'DeepSeek', contextWindow: '128K', contextK: 128, inputPrice: '$0.56', outputPrice: '$1.68', openSource: true, released: '2025-03', strengths: 'Cheap, strong general-purpose, open weights' },
  { name: 'DeepSeek R1', provider: 'DeepSeek', contextWindow: '128K', contextK: 128, inputPrice: '$0.56', outputPrice: '$1.68', openSource: true, released: '2025-01', strengths: 'Open-source reasoning, competes with o1' },
  // Mistral
  { name: 'Mistral Large 3', provider: 'Mistral', contextWindow: '256K', contextK: 256, inputPrice: '$2', outputPrice: '$6', openSource: false, released: '2025-03', strengths: 'Multilingual, code, reasoning, larger context' },
  { name: 'Mistral Small 3.1', provider: 'Mistral', contextWindow: '128K', contextK: 128, inputPrice: '$0.20', outputPrice: '$0.60', openSource: false, released: '2025-03', strengths: 'Very cheap, strong for its size' },
  // Others
  { name: 'Qwen 2.5 72B', provider: 'Alibaba', contextWindow: '128K', contextK: 128, inputPrice: 'Free*', outputPrice: 'Free*', openSource: true, released: '2024-09', strengths: 'Strong multilingual, coding, open weights' },
  { name: 'Kimi k1.5', provider: 'Moonshot AI', contextWindow: '128K', contextK: 128, inputPrice: '$0.40', outputPrice: '$1.60', openSource: false, released: '2025-01', strengths: 'Long-context reasoning, competitive pricing' },
];

type SortKey = 'name' | 'provider' | 'contextK' | 'inputPrice';

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
      if (sortBy === 'contextK') return (a.contextK - b.contextK) * dir;
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
                <td class="py-2.5 px-3 font-mono text-sm text-neon-cyan">{m.contextWindow}</td>
                <td class="py-2.5 px-3 font-mono text-sm text-text-primary">{m.inputPrice}</td>
                <td class="py-2.5 px-3 font-mono text-sm text-text-primary">{m.outputPrice}</td>
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
