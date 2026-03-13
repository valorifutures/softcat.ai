import { useState } from 'preact/hooks';
import modelsData from '../../data/models.json';
import { estimateTokens } from '../../utils/tokens';

interface Model {
  id: string;
  name: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
}

interface SavedPrompt {
  name: string;
  system: string;
  user: string;
  assistant: string;
}

const models: Model[] = (modelsData as Model[]).filter((m) => m.inputPrice > 0);

type DiffToken =
  | { type: 'equal'; value: string }
  | { type: 'removed'; value: string }
  | { type: 'added'; value: string };

// LCS-based word diff
function computeDiff(a: string[], b: string[]): DiffToken[] {
  const m = a.length;
  const n = b.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack
  const result: DiffToken[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.unshift({ type: 'equal', value: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', value: b[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', value: a[i - 1] });
      i--;
    }
  }
  return result;
}

function tokenize(text: string): string[] {
  // Split preserving whitespace tokens so we can reconstruct spacing
  return text.split(/(\s+)/).filter((s) => s.length > 0);
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.0000';
  if (cost < 0.0001) return '<$0.0001';
  return `$${cost.toFixed(4)}`;
}

function DiffView({ tokens }: { tokens: DiffToken[] }) {
  return (
    <div class="font-mono text-sm leading-relaxed break-words whitespace-pre-wrap">
      {tokens.map((t, i) => {
        if (t.type === 'equal') {
          return <span key={i}>{t.value}</span>;
        } else if (t.type === 'removed') {
          return (
            <span key={i} class="text-red-400 line-through bg-red-400/10 rounded px-0.5">
              {t.value}
            </span>
          );
        } else {
          return (
            <span key={i} class="text-neon-green bg-neon-green/10 rounded px-0.5">
              {t.value}
            </span>
          );
        }
      })}
    </div>
  );
}

function SavedPromptPicker({ onSelect, label }: { onSelect: (text: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);

  function loadPrompts() {
    try {
      const raw = localStorage.getItem('softcat-workbench');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPrompts(parsed as SavedPrompt[]);
        }
      }
    } catch {
      setPrompts([]);
    }
  }

  function handleClick() {
    if (!open) loadPrompts();
    setOpen(!open);
  }

  function handleSelect(p: SavedPrompt) {
    const parts = [p.system, p.user, p.assistant].filter((s) => s && s.trim().length > 0);
    onSelect(parts.join('\n\n'));
    setOpen(false);
  }

  return (
    <div class="relative inline-block">
      <button
        onClick={handleClick}
        class="px-2 py-1 bg-surface border border-surface-light rounded font-mono text-xs text-text-muted hover:text-neon-purple hover:border-neon-purple/40 transition-colors"
      >
        Load from Workbench
      </button>
      {open && (
        <div class="absolute z-20 top-full left-0 mt-1 w-64 bg-surface border border-surface-light rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {prompts.length === 0 ? (
            <div class="px-3 py-2 font-mono text-xs text-text-muted">No saved prompts found</div>
          ) : (
            prompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSelect(p)}
                class="w-full text-left px-3 py-2 font-mono text-xs text-text-primary hover:bg-surface-light/40 transition-colors border-b border-surface-light/30 last:border-0"
              >
                {p.name || `Prompt ${i + 1}`}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function PromptDiff() {
  const [promptA, setPromptA] = useState('');
  const [promptB, setPromptB] = useState('');
  const [selectedId, setSelectedId] = useState(models[0]?.id ?? '');

  const selectedModel = models.find((m) => m.id === selectedId) ?? models[0];

  const tokensA = estimateTokens(promptA);
  const tokensB = estimateTokens(promptB);
  const tokenDelta = tokensB - tokensA;
  const charDelta = promptB.length - promptA.length;

  const costA = selectedModel ? (tokensA / 1_000_000) * selectedModel.inputPrice : 0;
  const costB = selectedModel ? (tokensB / 1_000_000) * selectedModel.inputPrice : 0;
  const costDelta = costB - costA;

  const wordsA = tokenize(promptA);
  const wordsB = tokenize(promptB);
  const diff = computeDiff(wordsA, wordsB);

  // Split diff for each side
  const diffA: DiffToken[] = diff
    .filter((t) => t.type !== 'added')
    .map((t) => (t.type === 'removed' ? t : t));
  const diffB: DiffToken[] = diff
    .filter((t) => t.type !== 'removed')
    .map((t) => (t.type === 'added' ? t : t));

  const hasDiff = promptA.length > 0 || promptB.length > 0;

  return (
    <div class="space-y-6">
      {/* Model selector */}
      <div class="space-y-2">
        <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
          Model (for cost estimates)
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId((e.target as HTMLSelectElement).value)}
          class="w-full bg-surface border border-surface-light rounded-lg px-4 py-2.5 font-mono text-sm text-text-primary focus:outline-none focus:border-neon-cyan/50"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.provider}) — ${m.inputPrice}/M in
            </option>
          ))}
        </select>
      </div>

      {/* Inputs */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <label class="font-mono text-xs text-text-muted uppercase tracking-wider">
              Prompt A
            </label>
            <SavedPromptPicker label="A" onSelect={setPromptA} />
          </div>
          <textarea
            value={promptA}
            onInput={(e) => setPromptA((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste your original prompt here..."
            class="w-full h-48 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 resize-y"
          />
        </div>
        <div class="space-y-2">
          <div class="flex items-center gap-3">
            <label class="font-mono text-xs text-text-muted uppercase tracking-wider">
              Prompt B
            </label>
            <SavedPromptPicker label="B" onSelect={setPromptB} />
          </div>
          <textarea
            value={promptB}
            onInput={(e) => setPromptB((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste your revised prompt here..."
            class="w-full h-48 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 resize-y"
          />
        </div>
      </div>

      {/* Stats */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
          <div class="font-mono text-xl font-bold text-neon-cyan">{tokensA.toLocaleString()}</div>
          <div class="font-mono text-xs text-text-muted mt-1">tokens A</div>
        </div>
        <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
          <div class="font-mono text-xl font-bold text-neon-cyan">{tokensB.toLocaleString()}</div>
          <div class="font-mono text-xs text-text-muted mt-1">tokens B</div>
        </div>
        <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
          <div class={`font-mono text-xl font-bold ${tokenDelta > 0 ? 'text-red-400' : tokenDelta < 0 ? 'text-neon-green' : 'text-text-bright'}`}>
            {tokenDelta > 0 ? '+' : ''}{tokenDelta.toLocaleString()}
          </div>
          <div class="font-mono text-xs text-text-muted mt-1">token delta</div>
        </div>
        <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
          <div class={`font-mono text-xl font-bold ${charDelta > 0 ? 'text-red-400' : charDelta < 0 ? 'text-neon-green' : 'text-text-bright'}`}>
            {charDelta > 0 ? '+' : ''}{charDelta.toLocaleString()}
          </div>
          <div class="font-mono text-xs text-text-muted mt-1">char delta</div>
        </div>
      </div>

      {/* Cost comparison */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
          <div class="font-mono text-lg font-bold text-text-bright">{formatCost(costA)}</div>
          <div class="font-mono text-xs text-text-muted mt-1">cost A</div>
        </div>
        <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
          <div class="font-mono text-lg font-bold text-text-bright">{formatCost(costB)}</div>
          <div class="font-mono text-xs text-text-muted mt-1">cost B</div>
        </div>
        <div class={`bg-surface border rounded-lg p-4 text-center ${costDelta > 0 ? 'border-red-400/30' : costDelta < 0 ? 'border-neon-green/30' : 'border-surface-light'}`}>
          <div class={`font-mono text-lg font-bold ${costDelta > 0 ? 'text-red-400' : costDelta < 0 ? 'text-neon-green' : 'text-text-bright'}`}>
            {costDelta > 0 ? '+' : ''}{formatCost(Math.abs(costDelta))}
          </div>
          <div class="font-mono text-xs text-text-muted mt-1">cost delta</div>
        </div>
      </div>

      {/* Diff view */}
      {hasDiff && (
        <div class="space-y-3">
          <div class="font-mono text-xs text-text-muted uppercase tracking-wider">Word diff</div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-surface border border-surface-light rounded-lg p-4 space-y-1">
              <div class="font-mono text-xs text-text-muted mb-2">Prompt A</div>
              {promptA.length > 0 ? (
                <DiffView tokens={diffA} />
              ) : (
                <span class="font-mono text-xs text-text-muted italic">empty</span>
              )}
            </div>
            <div class="bg-surface border border-surface-light rounded-lg p-4 space-y-1">
              <div class="font-mono text-xs text-text-muted mb-2">Prompt B</div>
              {promptB.length > 0 ? (
                <DiffView tokens={diffB} />
              ) : (
                <span class="font-mono text-xs text-text-muted italic">empty</span>
              )}
            </div>
          </div>
          <div class="flex gap-4 font-mono text-xs text-text-muted">
            <span><span class="text-red-400 line-through">removed</span></span>
            <span><span class="text-neon-green">added</span></span>
            <span>unchanged</span>
          </div>
        </div>
      )}

      <p class="font-mono text-xs text-text-muted">
        Token estimates are approximate (~+/-15% vs real tokenizers).
        Costs are input-only estimates based on public API rates in USD per million tokens.
      </p>
    </div>
  );
}
