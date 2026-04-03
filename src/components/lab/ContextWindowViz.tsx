import { useState } from 'preact/hooks';

interface ModelWindow {
  name: string;
  provider: string;
  contextK: number;
  color: string;
}

const MODELS: ModelWindow[] = [
  { name: 'Claude Opus 4.6', provider: 'Anthropic', contextK: 1000, color: '#4ecb8f' },
  { name: 'Claude Sonnet 4.6', provider: 'Anthropic', contextK: 200, color: '#5ab8d4' },
  { name: 'GPT-4.1', provider: 'OpenAI', contextK: 1048, color: '#9b7acc' },
  { name: 'GPT-4.1 mini', provider: 'OpenAI', contextK: 1048, color: '#d4a54a' },
  { name: 'Gemini 2.5 Pro', provider: 'Google', contextK: 1000, color: '#da5e74' },
  { name: 'Gemini 2.5 Flash', provider: 'Google', contextK: 1000, color: '#4ecb8f' },
  { name: 'Llama 4 Scout', provider: 'Meta', contextK: 512, color: '#5ab8d4' },
  { name: 'DeepSeek R1', provider: 'DeepSeek', contextK: 128, color: '#9b7acc' },
];

function formatTokens(k: number): string {
  if (k >= 1000) return `${(k / 1000).toFixed(0)}M`;
  return `${k}K`;
}

export default function ContextWindowViz() {
  const [usage, setUsage] = useState(50);
  const maxContext = Math.max(...MODELS.map((m) => m.contextK));

  return (
    <div class="space-y-6">
      <div>
        <label class="block font-mono text-sm text-text-muted mb-2">
          Simulated usage: {usage}% of context window
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={usage}
          onInput={(e) => setUsage(parseInt((e.target as HTMLInputElement).value))}
          class="w-full accent-neon-green"
        />
        <div class="flex justify-between font-mono text-xs text-text-muted mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div class="space-y-3">
        {MODELS.map((model) => {
          const widthPct = (model.contextK / maxContext) * 100;
          const fillPct = usage;
          const isWarning = usage >= 80 && usage < 100;
          const isDanger = usage >= 100;
          const barColor = isDanger ? '#da5e74' : isWarning ? '#d4a54a' : model.color;

          return (
            <div key={model.name} class="bg-surface border border-surface-light rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <div>
                  <span class="font-mono text-sm text-text-bright">{model.name}</span>
                  <span class="font-mono text-xs text-text-muted ml-2">{model.provider}</span>
                </div>
                <span class="font-mono text-xs text-text-muted">{formatTokens(model.contextK)}</span>
              </div>
              <div class="relative h-6 bg-void rounded-full overflow-hidden" style={`width: ${widthPct}%`}>
                <div
                  class="h-full rounded-full transition-all duration-300"
                  style={`width: ${Math.min(fillPct, 100)}%; background-color: ${barColor}; opacity: 0.8;`}
                />
                {isWarning && (
                  <div class="absolute right-2 top-0 h-full flex items-center">
                    <span class="font-mono text-xs text-neon-amber font-bold">80%</span>
                  </div>
                )}
                {isDanger && (
                  <div class="absolute right-2 top-0 h-full flex items-center">
                    <span class="font-mono text-xs text-neon-red font-bold">FULL</span>
                  </div>
                )}
              </div>
              <div class="font-mono text-xs text-text-muted mt-1">
                {formatTokens(Math.round(model.contextK * usage / 100))} / {formatTokens(model.contextK)} used
              </div>
            </div>
          );
        })}
      </div>

      <div class="bg-surface border border-surface-light rounded-lg p-4 font-mono text-xs text-text-muted">
        Context windows as of April 2026. Bars scale relative to the largest window.
        Yellow at 80% usage. Red at 100%. Actual token counts depend on content type.
      </div>
    </div>
  );
}
