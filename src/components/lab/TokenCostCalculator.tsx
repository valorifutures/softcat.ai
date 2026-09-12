import { useState } from 'preact/hooks';
import { hasVerifiedPrice } from '../../lib/model-pricing.mjs';
import modelsData from '../../data/models.json';
import { conversationUsage } from '../../lib/conversation-cost.mjs';
import { estimateTokens } from '../../utils/tokens';

interface Model {
  id: string;
  name: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
}

const models: Model[] = modelsData.filter(hasVerifiedPrice) as Model[];

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
  const usage = conversationUsage(turns);
  const convInputTokens = usage.inputTokens;
  const convOutputTokens = usage.outputTokens;
  const convInputCost = selectedModel ? (convInputTokens / 1_000_000) * selectedModel.inputPrice : 0;
  const convOutputCost = selectedModel ? (convOutputTokens / 1_000_000) * selectedModel.outputPrice : 0;
  const convTotalCost = convInputCost + convOutputCost;

  if (!selectedModel) return <p class="text-text-muted">No verified model rates are available in this snapshot. <a href="/lab/model-comparison" class="text-neon-cyan underline">Check the model records</a>.</p>;

  return (
    <div class="space-y-6">
      <div class="space-y-2">
        <label class="font-mono text-xs text-text-muted uppercase tracking-wider block">
          Model
        </label>
        <select
          aria-label="Model for cost estimate"
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
                aria-label="Input text"
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
                aria-label="Expected output"
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
              aria-label="Conversation transcript"
              value={conversationText}
              onInput={(e) => setConversationText((e.target as HTMLTextAreaElement).value)}
              placeholder={"User: What is the capital of France?\nAssistant: The capital of France is Paris.\nUser: And Germany?\nAssistant: The capital of Germany is Berlin."}
              class="w-full h-56 bg-surface border border-surface-light rounded-lg p-4 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50 resize-y"
            />
          </div>

          <p class="text-sm text-text-muted leading-relaxed">Each Assistant section is treated as one reply. Every call includes all earlier conversation text as input. A trailing User section is a planned call with no output estimate yet. System prompts, cached discounts and tool calls are excluded.</p>
          {usage.calls.length > 0 && (
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="border-b border-surface-light">
                    <th class="py-2 px-3 font-mono text-xs text-text-muted">Call</th>
                    <th class="py-2 px-3 font-mono text-xs text-text-muted">Input history</th>
                    <th class="py-2 px-3 font-mono text-xs text-text-muted">Output tokens</th>
                    <th class="py-2 px-3 font-mono text-xs text-text-muted">Est. Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.calls.map((call) => {
                    const cost = (call.inputTokens * selectedModel.inputPrice + call.outputTokens * selectedModel.outputPrice) / 1_000_000;
                    return <tr key={call.number} class="border-b border-surface-light/30">
                      <td class="py-2 px-3 font-mono text-sm text-text-muted">{call.number}{call.pending ? ' (planned)' : ''}</td>
                      <td class="py-2 px-3 font-mono text-sm text-text-primary">{call.inputTokens.toLocaleString()}</td>
                      <td class="py-2 px-3 font-mono text-sm text-text-primary">{call.pending ? 'unknown' : call.outputTokens.toLocaleString()}</td>
                      <td class="py-2 px-3 font-mono text-sm text-text-primary">{formatCost(cost)}</td>
                    </tr>;
                  })}
                  <tr class="border-t border-surface-light">
                    <td class="py-2 px-3 font-mono text-xs text-text-muted font-bold">Totals</td>
                    <td class="py-2 px-3 font-mono text-sm text-text-bright font-bold">{convInputTokens.toLocaleString()}</td>
                    <td class="py-2 px-3 font-mono text-sm text-text-bright font-bold">{convOutputTokens.toLocaleString()}</td>
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
        Token counts use a rough character-based estimate, not a model tokenizer. Accuracy varies with language, code and encoding. Prices are saved API rates. Actual usage, caching and provider fees can differ.
      </p>
    </div>
  );
}
