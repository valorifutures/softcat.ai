import { useState, useRef, useEffect } from 'preact/hooks';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface MessageCost {
  input: number;
  output: number;
  total: number;
}

interface ChatPane {
  id: string;
  model: string;
  messages: Message[];
  messageCosts: Record<number, MessageCost>;
  loading: boolean;
  error: string;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
}

// Approximate token estimator. For code-heavy text (>20% non-alpha chars),
// uses chars/3.2; otherwise chars/4.3. This is a rough heuristic — actual
// tokenisation varies by model and encoding.
function estimateTokens(text: string): number {
  const nonAlpha = text.replace(/[a-zA-Z\s]/g, '').length;
  const ratio = nonAlpha / (text.length || 1);
  return Math.ceil(ratio > 0.2 ? text.length / 3.2 : text.length / 4.3);
}

function createPane(model: string): ChatPane {
  return { id: crypto.randomUUID(), model, messages: [], messageCosts: {}, loading: false, error: '' };
}

function formatCost(usd: number): string {
  if (usd < 0.0001) return '<$0.0001';
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

export default function ChatPlayground({ models }: { models: ModelInfo[] }) {
  const [apiKey, setApiKey] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [input, setInput] = useState('');
  const [panes, setPanes] = useState<ChatPane[]>([createPane(models[0]?.id || 'anthropic/claude-sonnet-4')]);
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [maxTokens, setMaxTokens] = useState(2048);
  const [temperature, setTemperature] = useState(0.7);
  const [sessionCost, setSessionCost] = useState(0);
  const bottomRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Load API key from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('softcat-openrouter-key');
      if (saved) setApiKey(saved);
    } catch {}
  }, []);

  // Check for workbench handoff on mount
  useEffect(() => {
    try {
      const handoff = localStorage.getItem('softcat-workbench-handoff');
      if (handoff) {
        const parsed = JSON.parse(handoff);
        if (parsed.system) setSystemPrompt(parsed.system);
        localStorage.removeItem('softcat-workbench-handoff');
      }
    } catch {}
  }, []);

  const saveKey = (key: string) => {
    setApiKey(key);
    if (key) localStorage.setItem('softcat-openrouter-key', key);
    else localStorage.removeItem('softcat-openrouter-key');
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    Object.values(bottomRefs.current).forEach((el) => el?.scrollIntoView({ behavior: 'smooth' }));
  }, [panes]);

  const switchMode = (newMode: 'single' | 'compare') => {
    setMode(newMode);
    if (newMode === 'compare' && panes.length < 2) {
      const secondModel = models.length > 1 ? models[1].id : models[0]?.id || 'openai/gpt-4o';
      setPanes([panes[0], createPane(secondModel)]);
    } else if (newMode === 'single' && panes.length > 1) {
      setPanes([panes[0]]);
    }
  };

  const updatePane = (id: string, update: Partial<ChatPane>) => {
    setPanes((prev) => prev.map((p) => (p.id === id ? { ...p, ...update } : p)));
  };

  const addMessageCost = (paneId: string, msgIndex: number, cost: MessageCost) => {
    setPanes((prev) =>
      prev.map((p) => {
        if (p.id !== paneId) return p;
        return { ...p, messageCosts: { ...p.messageCosts, [msgIndex]: cost } };
      }),
    );
    setSessionCost((prev) => prev + cost.total);
  };

  const sendMessage = async () => {
    if (!input.trim() || !apiKey) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setInput('');

    // Add user message to all panes
    const updatedPanes = panes.map((p) => ({
      ...p,
      messages: [...p.messages, userMessage],
      loading: true,
      error: '',
    }));
    setPanes(updatedPanes);

    // Send to all panes in parallel
    for (const pane of updatedPanes) {
      fetchResponse(pane.id, pane.model, [...pane.messages]);
    }
  };

  const fetchResponse = async (paneId: string, model: string, messages: Message[]) => {
    try {
      const apiMessages = systemPrompt
        ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
        : messages;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://softcat.ai',
          'X-Title': 'SOFT CAT Chat Playground',
        },
        body: JSON.stringify({
          model,
          messages: apiMessages,
          max_tokens: maxTokens,
          temperature,
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        updatePane(paneId, { loading: false, error: `API error ${response.status}: ${err.slice(0, 200)}` });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        updatePane(paneId, { loading: false, error: 'No response stream' });
        return;
      }

      let assistantContent = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setPanes((prev) =>
                prev.map((p) => {
                  if (p.id !== paneId) return p;
                  const msgs = [...p.messages];
                  const lastMsg = msgs[msgs.length - 1];
                  if (lastMsg?.role === 'assistant') {
                    msgs[msgs.length - 1] = { ...lastMsg, content: assistantContent };
                  } else {
                    msgs.push({ role: 'assistant', content: assistantContent });
                  }
                  return { ...p, messages: msgs };
                }),
              );
            }
          } catch {}
        }
      }

      // Estimate cost after streaming completes
      const modelInfo = models.find((m) => m.id === model);
      if (modelInfo) {
        const allText = apiMessages.map((m) => m.content).join(' ');
        const inputTokens = estimateTokens(allText);
        const outputTokens = estimateTokens(assistantContent);
        // Prices are per million tokens
        const inputCost = (inputTokens / 1_000_000) * modelInfo.inputPrice;
        const outputCost = (outputTokens / 1_000_000) * modelInfo.outputPrice;
        const totalCost = inputCost + outputCost;
        // The assistant message index is messages.length (user messages array + the new assistant msg)
        const assistantMsgIndex = messages.length; // 0-indexed, this is the position of the assistant reply
        addMessageCost(paneId, assistantMsgIndex, { input: inputCost, output: outputCost, total: totalCost });
      }

      updatePane(paneId, { loading: false });
    } catch (err: any) {
      updatePane(paneId, { loading: false, error: err.message || 'Request failed' });
    }
  };

  const clearAll = () => {
    setPanes((prev) => prev.map((p) => ({ ...p, messages: [], messageCosts: {}, error: '' })));
    setSessionCost(0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div class="space-y-4">
      {/* API Key */}
      <div class="bg-surface border border-surface-light rounded-lg p-4 space-y-3">
        <div class="font-mono text-xs text-text-muted uppercase tracking-wider">OpenRouter API Key (BYOK)</div>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              type={keyVisible ? 'text' : 'password'}
              value={apiKey}
              onInput={(e) => saveKey((e.target as HTMLInputElement).value)}
              placeholder="sk-or-v1-..."
              class="w-full bg-void border border-surface-light rounded px-3 py-1.5 font-mono text-sm text-text-primary focus:outline-none focus:border-neon-green/50 pr-16"
            />
            <button
              onClick={() => setKeyVisible(!keyVisible)}
              class="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs text-text-muted hover:text-text-primary"
            >
              {keyVisible ? 'hide' : 'show'}
            </button>
          </div>
        </div>
        <p class="font-mono text-xs text-text-muted">
          Get a key from{' '}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" class="text-neon-cyan hover:underline">
            openrouter.ai/keys
          </a>
          . Your key stays in your browser, never sent to our servers.
        </p>
      </div>

      {/* Controls */}
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex gap-1 bg-surface border border-surface-light rounded-lg p-1">
          <button
            onClick={() => switchMode('single')}
            class={`px-3 py-1 rounded font-mono text-xs transition-all ${
              mode === 'single' ? 'bg-neon-green/20 text-neon-green' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            single
          </button>
          <button
            onClick={() => switchMode('compare')}
            class={`px-3 py-1 rounded font-mono text-xs transition-all ${
              mode === 'compare' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            compare
          </button>
        </div>

        <div class="flex items-center gap-2">
          <label class="font-mono text-xs text-text-muted">temp:</label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={temperature}
            onInput={(e) => setTemperature(parseFloat((e.target as HTMLInputElement).value))}
            class="w-20 accent-neon-green"
          />
          <span class="font-mono text-xs text-text-primary w-8">{temperature}</span>
        </div>

        <div class="flex items-center gap-2">
          <label class="font-mono text-xs text-text-muted">max tokens:</label>
          <select
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt((e.target as HTMLSelectElement).value))}
            class="bg-surface border border-surface-light rounded px-2 py-1 font-mono text-xs text-text-primary focus:outline-none"
          >
            <option value="256">256</option>
            <option value="512">512</option>
            <option value="1024">1024</option>
            <option value="2048">2048</option>
            <option value="4096">4096</option>
          </select>
        </div>

        {/* Session cost pill */}
        {sessionCost > 0 && (
          <div class="flex items-center gap-1.5 bg-surface border border-surface-light rounded-full px-3 py-1">
            <span class="font-mono text-xs text-text-muted">session:</span>
            <span class="font-mono text-xs text-neon-amber">{formatCost(sessionCost)}</span>
          </div>
        )}

        <button
          onClick={clearAll}
          class="px-3 py-1.5 rounded font-mono text-xs bg-surface border border-surface-light text-text-muted hover:text-red-400 transition-colors ml-auto"
        >
          clear chat
        </button>
      </div>

      {/* System prompt */}
      <details class="bg-surface border border-surface-light rounded-lg">
        <summary class="px-4 py-2 font-mono text-xs text-text-muted cursor-pointer hover:text-text-primary">
          System prompt (optional)
        </summary>
        <div class="px-4 pb-4">
          <textarea
            value={systemPrompt}
            onInput={(e) => setSystemPrompt((e.target as HTMLTextAreaElement).value)}
            class="w-full h-24 bg-void border border-surface-light rounded p-3 font-mono text-sm text-text-primary focus:outline-none focus:border-neon-green/50 resize-y"
            placeholder="You are a helpful assistant..."
          />
        </div>
      </details>

      {/* Chat panes */}
      <div class={`grid gap-4 ${mode === 'compare' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {panes.map((pane) => (
          <div key={pane.id} class="flex flex-col bg-surface border border-surface-light rounded-lg overflow-hidden" style="height: 500px">
            {/* Model selector */}
            <div class="flex items-center gap-2 px-3 py-2 border-b border-surface-light bg-void/50">
              <select
                value={pane.model}
                onChange={(e) => updatePane(pane.id, { model: (e.target as HTMLSelectElement).value })}
                class="bg-void border border-surface-light rounded px-2 py-1 font-mono text-xs text-text-primary focus:outline-none flex-1"
              >
                {models.map((m) => (
                  <option value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
              {pane.loading && <span class="font-mono text-xs text-neon-amber animate-pulse">streaming...</span>}
            </div>

            {/* Messages */}
            <div class="flex-1 overflow-y-auto p-3 space-y-3">
              {pane.messages.length === 0 && (
                <div class="flex items-center justify-center h-full">
                  <p class="font-mono text-sm text-text-muted">Send a message to start chatting.</p>
                </div>
              )}
              {pane.messages.map((msg, i) => (
                <div key={i}>
                  <div class={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      class={`max-w-[85%] rounded-lg px-3 py-2 font-mono text-sm whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-neon-green/10 border border-neon-green/20 text-text-primary'
                          : 'bg-void border border-surface-light text-text-primary'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                  {msg.role === 'assistant' && pane.messageCosts[i] && (
                    <div class="flex justify-start mt-0.5 ml-1">
                      <span class="font-mono text-xs text-text-muted">
                        cost: <span class="text-neon-amber">{formatCost(pane.messageCosts[i].total)}</span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {pane.error && (
                <div class="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 font-mono text-xs text-red-400">
                  {pane.error}
                </div>
              )}
              <div ref={(el) => { bottomRefs.current[pane.id] = el; }} />
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div class="flex gap-2">
        <textarea
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKeyDown}
          placeholder={apiKey ? 'Type a message... (Enter to send, Shift+Enter for newline)' : 'Enter your OpenRouter API key above to start'}
          disabled={!apiKey}
          class="flex-1 bg-surface border border-surface-light rounded-lg px-4 py-3 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50 resize-none disabled:opacity-50"
          rows={2}
        />
        <button
          onClick={sendMessage}
          disabled={!apiKey || !input.trim() || panes.some((p) => p.loading)}
          class="px-6 py-3 rounded-lg font-mono text-sm bg-neon-green/20 border border-neon-green text-neon-green hover:bg-neon-green/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed self-end"
        >
          send
        </button>
      </div>
    </div>
  );
}
