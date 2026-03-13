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

// Improved token estimator: code/structured text (~3.2 chars/token) vs prose (~4.3 chars/token).
// If >20% of characters are non-alphabetic, treat as code/structured; otherwise treat as prose.
function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
  const alphaRatio = alphaCount / text.length;
  if (alphaRatio < 0.8) {
    return Math.ceil(text.length / 3.2);
  }
  return Math.ceil(text.length / 4.3);
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.0000';
  if (cost < 0.0001) return `<$0.0001`;
  return `$${cost.toFixed(4)}`;
}

interface ConversationTurn {
  turnNumber: number;
  role: string;
  text: string;
  tokens: number;
}

function parseConversation(text: string): ConversationTurn[] {
  const lines = text.split('\n');
  const turns: ConversationTurn[] = [];
  let currentRole = '';
  let currentLines: string[] = [];
  let turnNumber = 0;

  const rolePattern = /^(user|assistant|human|ai)\s*:/i;

  for (const line of lines) {
    const match = line.match(rolePattern);
    if (match) {
      // Save previous turn
      if (currentRole && currentLines.length > 0) {
        const turnText = currentLines.join('\n').trim();
        if (turnText.length > 0) {
          turnNumber++;
          turns.push({
            turnNumber,
            role: currentRole,
            text: turnText,
            tokens: estimateTokens(turnText),
          });
        }
      }
      currentRole = match[1].toLowerCase();
      if (currentRole === 'human') currentRole = 'user';
      if (currentRole === 'ai') currentRole = 'assistant';
      // Rest of this line after the marker
      const rest = line.slice(match[0].length).trim();
      currentLines = rest.length > 0 ? [rest] : [];
    } else {
      currentLines.push(line);
    }
  }

  // Final turn
  if (currentRole && currentLines.length > 0) {
    const turnText = currentLines.join('\n').trim();
    if (turnText.length > 0) {
      turnNumber++;
      turns.push({
        turnNumber,
        role: currentRole,
        text: turnText,
        tokens: estimateTokens(turnText),
      });
    }
  }

  return turns;
}

export default function TokenCostCalculator() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [conversationText, setConversationText] = useState('');
  const [selectedId, setSelectedId] = useState(models[0]?.id ?? '');
  const [conversationMode, setConversationMode] = useState(false);

  const selectedModel = models.find((m) => m.id === selectedId) ?? models[0];

  // Single-prompt mode calculations
  const inputTokens = estimateTokens(inputText);
  const outputTokens = estimateTokens(outputText);
  const inputCost = selectedModel
    ? (inputTokens / 1_000_000) * selectedModel.inputPrice
    : 0;
  const outputCost = selectedModel
    ? (outputTokens / 1_000_000) * selectedModel.outputPrice
    : 0;
  const totalCost = inputCost + outputCost;

  // Conversation mode calculations
  const turns = conversationMode ? parseConversation(conversationText) : [];
  const convInputTokens = turns.filter((t) => t.role === 'user').reduce((s, t) => s + t.tokens, 0);
  const convOutputTokens = turns.filter((t) => t.role === 'assistant').reduce((s, t) => s + t.tokens, 0);
  const convInputCost = selectedModel ? (convInputTokens / 1_000_000) * selectedModel.inputPrice : 0;
  const convOutputCost = selectedModel ? (convOutputTokens / 1_000_000) * selectedModel.outputPrice : 0;
  const convTotalCost = convInputCost + convOutputCost;

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

      {/* Mode toggle */}
      <div class="flex items-center gap-3">
        <button
          onClick={() => setConversationMode(false)}
          class={`px-4 py-1.5 rounded-lg font-mono text-xs transition-colors ${
            !conversationMode
              ? 'bg-neon-green/10 border border-neon-green/40 text-neon-green'
              : 'bg-surface border border-surface-light text-text-muted hover:text-text-bright'
          }`}
        >
          Single prompt
        </button>
        <button
          onClick={() => setConversationMode(true)}
          class={`px-4 py-1.5 rounded-lg font-mono text-xs transition-colors ${
            conversationMode
              ? 'bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan'
              : 'bg-surface border border-surface-light text-text-muted hover:text-text-bright'
          }`}
        >
          Conversation
        </button>
      </div>

      {!conversationMode ? (
        <>
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
        </>
      ) : (
        <>
          <div class="space-y-2">
            <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
              Conversation <span class="normal-case font-sans">(use User: / Assistant: / Human: / AI: markers)</span>
            </label>
            <textarea
              value={conversationText}
              onInput={(e) => setConversationText((e.target as HTMLTextAreaElement).value)}
              placeholder={"User: What is the capital of France?\nAssistant: The capital of France is Paris.\nUser: And Germany?\nAssistant: The capital of Germany is Berlin."}
              class="w-full h-56 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 resize-y"
            />
          </div>

          {turns.length > 0 && (
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="border-b border-surface-light">
                    <th class="py-2 px-3 font-mono text-xs text-text-muted">Turn</th>
                    <th class="py-2 px-3 font-mono text-xs text-text-muted">Role</th>
                    <th class="py-2 px-3 font-mono text-xs text-text-muted">Est. Tokens</th>
                    <th class="py-2 px-3 font-mono text-xs text-text-muted">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {turns.map((t) => {
                    const price = t.role === 'user' ? selectedModel.inputPrice : selectedModel.outputPrice;
                    const cost = (t.tokens / 1_000_000) * price;
                    return (
                      <tr key={t.turnNumber} class="border-b border-surface-light/30 hover:bg-surface-light/20 transition-colors">
                        <td class="py-2 px-3 font-mono text-sm text-text-muted">{t.turnNumber}</td>
                        <td class={`py-2 px-3 font-mono text-sm ${t.role === 'user' ? 'text-neon-green' : 'text-neon-cyan'}`}>{t.role}</td>
                        <td class="py-2 px-3 font-mono text-sm text-text-primary">{t.tokens.toLocaleString()}</td>
                        <td class="py-2 px-3 font-mono text-sm text-text-primary">{formatCost(cost)}</td>
                      </tr>
                    );
                  })}
                  <tr class="border-t border-surface-light">
                    <td class="py-2 px-3 font-mono text-xs text-text-muted font-bold" colSpan={2}>Totals</td>
                    <td class="py-2 px-3 font-mono text-sm text-text-bright font-bold">{(convInputTokens + convOutputTokens).toLocaleString()}</td>
                    <td class="py-2 px-3 font-mono text-sm text-text-bright font-bold">{formatCost(convTotalCost)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
              <div class="font-mono text-2xl font-bold text-neon-green">{convInputTokens.toLocaleString()}</div>
              <div class="font-mono text-xs text-text-muted mt-1">input tokens</div>
            </div>
            <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
              <div class="font-mono text-2xl font-bold text-neon-cyan">{convOutputTokens.toLocaleString()}</div>
              <div class="font-mono text-xs text-text-muted mt-1">output tokens</div>
            </div>
            <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
              <div class="font-mono text-2xl font-bold text-text-bright">{formatCost(convInputCost)}</div>
              <div class="font-mono text-xs text-text-muted mt-1">input cost</div>
            </div>
            <div class="bg-surface border border-surface-light rounded-lg p-4 text-center">
              <div class="font-mono text-2xl font-bold text-text-bright">{formatCost(convOutputCost)}</div>
              <div class="font-mono text-xs text-text-muted mt-1">output cost</div>
            </div>
          </div>

          <div class="bg-surface border border-neon-cyan/30 rounded-lg p-5 card-glow flex items-center justify-between">
            <span class="font-mono text-sm text-text-muted">Total estimated cost</span>
            <span class="font-mono text-2xl font-bold text-neon-cyan glow-cyan">{formatCost(convTotalCost)}</span>
          </div>
        </>
      )}

      <p class="font-mono text-xs text-text-muted">
        Token estimates are approximate (~+/-15% vs real tokenizers). Pricing from public API rates.
      </p>
    </div>
  );
}
