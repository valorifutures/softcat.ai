import { useState } from 'preact/hooks';
import modelsData from '../../data/models.json';

interface Model {
  id: string;
  name: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
}

const models: Model[] = (modelsData as Model[]).filter(
  (m) => m.inputPrice > 0 || m.outputPrice > 0
);

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.0000';
  if (cost < 0.0001) return `<$0.0001`;
  return `$${cost.toFixed(4)}`;
}

export default function TokenCostCalculator() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [selectedId, setSelectedId] = useState(models[0]?.id ?? '');

  const selectedModel = models.find((m) => m.id === selectedId) ?? models[0];

  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);

  const inputCost = selectedModel
    ? (inputTokens / 1_000_000) * selectedModel.inputPrice
    : 0;
  const outputCost = selectedModel
    ? (outputTokens / 1_000_000) * selectedModel.outputPrice
    : 0;
  const totalCost = inputCost + outputCost;

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
          Model
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId((e.target as HTMLSelectElement).value)}
          class="w-full bg-surface border border-surface-light rounded-lg px-4 py-2.5 font-mono text-sm text-text-primary focus:outline-none focus:border-neon-green/50"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.provider}) — ${m.inputPrice}/M in · ${m.outputPrice}/M out
            </option>
          ))}
        </select>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
            Input text
          </label>
          <textarea
            value={inputText}
            onInput={(e) => setInputText((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste your prompt or input here..."
            class="w-full h-40 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50 resize-y"
          />
        </div>
        <div class="space-y-2">
          <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
            Expected output <span class="text-text-muted normal-case font-sans">(optional)</span>
          </label>
          <textarea
            value={outputText}
            onInput={(e) => setOutputText((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste expected response here..."
            class="w-full h-40 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50 resize-y"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
          <div class="font-mono text-2xl font-bold text-neon-green">{inputTokens.toLocaleString()}</div>
          <div class="font-mono text-xs text-text-muted mt-1">input tokens</div>
        </div>
        <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
          <div class="font-mono text-2xl font-bold text-neon-green">{outputTokens.toLocaleString()}</div>
          <div class="font-mono text-xs text-text-muted mt-1">output tokens</div>
        </div>
        <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
          <div class="font-mono text-2xl font-bold text-text-bright">{formatCost(inputCost)}</div>
          <div class="font-mono text-xs text-text-muted mt-1">input cost</div>
        </div>
        <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
          <div class="font-mono text-2xl font-bold text-text-bright">{formatCost(outputCost)}</div>
          <div class="font-mono text-xs text-text-muted mt-1">output cost</div>
        </div>
      </div>

      <div class="bg-surface border border-neon-green/30 rounded-lg p-5 card-glow flex items-center justify-between">
        <span class="font-mono text-sm text-text-muted">Total estimated cost</span>
        <span class="font-mono text-2xl font-bold text-neon-green glow-green">{formatCost(totalCost)}</span>
      </div>

      <p class="font-mono text-xs text-text-muted">
        Token counts use a 1 token per 4 characters approximation. Actual counts vary by model tokenizer.
        Pricing from public API rates in USD per million tokens.
      </p>
    </div>
  );
}
