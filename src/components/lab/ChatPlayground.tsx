import { useState, useRef, useEffect } from 'preact/hooks';
import { readChatStream } from '../../lib/chat-stream.mjs';
import { HANDOFF_KEY, FIELD_LIMIT, parseWorkbenchHandoff } from '../../lib/prompt-workbench.mjs';
import { estimateTokens } from '../../utils/tokens';

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
  const [rememberKey, setRememberKey] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [handoffNotice, setHandoffNotice] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [input, setInput] = useState('');
  const [panes, setPanes] = useState<ChatPane[]>(() => [createPane(models[0]?.id || '')]);
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [maxTokens, setMaxTokens] = useState(2048);
  const [temperature, setTemperature] = useState(0.7);
  const [sessionCost, setSessionCost] = useState(0);
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const controllers = useRef(new Map<string, AbortController>());
  const sending = useRef(false);
  const busy = panes.some((pane) => pane.loading);
  const modelsReady = panes.every((pane) => models.some((model) => model.id === pane.model));

  useEffect(() => () => { controllers.current.forEach((controller) => controller.abort()); }, []);

  // Existing keys migrate to page memory unless saving was explicitly chosen.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('softcat-openrouter-key');
      const remember = localStorage.getItem('softcat-remember-key') === 'yes';
      if (saved) setApiKey(saved);
      setRememberKey(remember);
      if (!remember) localStorage.removeItem('softcat-openrouter-key');
    } catch {}
  }, []);

  // Transfer a draft once within this tab. Importing never sends a request.
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('from') === 'workbench') {
        const raw = sessionStorage.getItem(HANDOFF_KEY);
        sessionStorage.removeItem(HANDOFF_KEY);
        const handoff = parseWorkbenchHandoff(raw);
        if (!handoff) { setHandoffNotice('The Workbench draft was unavailable or expired. Open it again from the Workbench.'); return; }
        setSystemPrompt(handoff.system); setInput(handoff.user);
        const knownModel = models.some((model) => model.id === handoff.model);
        setPanes([createPane(knownModel ? handoff.model : '')]);
        setHandoffNotice(knownModel ? 'Draft imported from Prompt Workbench. Review the system prompt, message and model before choosing Send. Nothing has been sent.' : 'Draft imported. Its model is no longer in the verified list, so choose a model before sending. Nothing has been sent.');
      } else {
        // Older Workbench links transferred only a system prompt.
        const raw = localStorage.getItem('softcat-workbench-handoff');
        localStorage.removeItem('softcat-workbench-handoff');
        if (raw && raw.length <= FIELD_LIMIT + 100) {
          const legacy = JSON.parse(raw);
          if (legacy && typeof legacy.system === 'string' && legacy.system.length <= FIELD_LIMIT) {
            setSystemPrompt(legacy.system);
            setHandoffNotice('Imported a system prompt from an earlier Workbench transfer. Add your user message before sending.');
          }
        }
      }
    } catch { setHandoffNotice('This browser could not import the Workbench draft. Your saved prompts remain in the Workbench.'); }
  }, []);

  const persistKey = (key: string, remember: boolean) => {
    setStorageError('');
    try {
      if (key && remember) {
        localStorage.setItem('softcat-remember-key', 'yes');
        localStorage.setItem('softcat-openrouter-key', key);
      } else {
        localStorage.removeItem('softcat-openrouter-key');
        localStorage.removeItem('softcat-remember-key');
      }
    } catch {
      setStorageError('This browser could not update saved-key storage. Clear this site’s data in browser settings to remove a previously saved key.');
    }
  };

  const saveKey = (key: string) => {
    setApiKey(key);
    persistKey(key, rememberKey);
  };

  // Scroll the message region, never the whole page on hydration.
  useEffect(() => {
    Object.values(scrollRefs.current).forEach((element) => {
      if (element && element.scrollHeight - element.scrollTop - element.clientHeight < 160) element.scrollTop = element.scrollHeight;
    });
  }, [panes]);

  const switchMode = (newMode: 'single' | 'compare') => {
    if (sending.current) return;
    setMode(newMode);
    if (newMode === 'compare' && panes.length < 2) {
      const secondModel = models.length > 1 ? models[1].id : models[0]?.id || '';
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
    if (!input.trim() || !apiKey || sending.current || !modelsReady) return;
    sending.current = true;

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

    try {
      await Promise.all(updatedPanes.map((pane) => fetchResponse(pane.id, pane.model, [...pane.messages])));
    } finally {
      sending.current = false;
    }
  };

  const fetchResponse = async (paneId: string, model: string, messages: Message[]) => {
    const controller = new AbortController();
    controllers.current.set(paneId, controller);
    try {
      const apiMessages = systemPrompt
        ? [{ role: 'system' as const, content: systemPrompt }, ...messages]
        : messages;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
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

      const result = await readChatStream(response.body, (content: string) => {
        setPanes((previous) => previous.map((pane) => {
          if (pane.id !== paneId) return pane;
          return { ...pane, messages: [...messages, { role: 'assistant' as const, content }] };
        }));
      });
      const assistantContent = result.text;

      // Estimate cost after streaming completes
      const modelInfo = models.find((m) => m.id === model);
      if (modelInfo) {
        const allText = apiMessages.map((m) => m.content).join(' ');
        const measuredInput = result.usage?.prompt_tokens;
        const measuredOutput = result.usage?.completion_tokens;
        const inputTokens = Number.isFinite(measuredInput) && measuredInput >= 0 ? measuredInput : estimateTokens(allText);
        const outputTokens = Number.isFinite(measuredOutput) && measuredOutput >= 0 ? measuredOutput : estimateTokens(assistantContent);
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
      updatePane(paneId, { loading: false, error: err.name === 'AbortError' ? 'Stopped. The provider may charge for partial work.' : err.message || 'Request failed' });
    } finally {
      controllers.current.delete(paneId);
      updatePane(paneId, { loading: false });
    }
  };

  const stopAll = () => { controllers.current.forEach((controller) => controller.abort()); };

  const clearAll = () => {
    if (sending.current) return;
    setPanes((prev) => prev.map((p) => ({ ...p, messages: [], messageCosts: {}, error: '' })));
    setSessionCost(0);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!models.length) return <p class="text-text-muted">No verified model rates are available for chat in this snapshot. <a href="/lab/model-comparison" class="text-neon-cyan underline">Check the model records</a>.</p>;

  return (
    <div class="space-y-4">
      {handoffNotice && <p role="status" class="rounded-lg border border-neon-green/30 bg-neon-green/5 p-4 text-sm leading-relaxed text-text-primary">{handoffNotice}</p>}
      {/* API Key */}
      <div class="bg-surface border border-surface-light rounded-lg p-4 space-y-3">
        <label for="openrouter-key" class="block font-mono text-xs text-text-muted uppercase tracking-wider">OpenRouter API key</label>
        <div class="flex gap-2">
          <div class="relative flex-1">
            <input
              id="openrouter-key"
              autoComplete="off"
              spellCheck={false}
              type={keyVisible ? 'text' : 'password'}
              value={apiKey}
              onInput={(e) => saveKey((e.target as HTMLInputElement).value)}
              placeholder="sk-or-v1-..."
              class="w-full bg-void border border-surface-light rounded px-3 py-1.5 font-mono text-sm text-text-primary focus:outline-none focus:border-neon-green/50 pr-16"
            />
            <button
              aria-label={keyVisible ? 'Hide API key' : 'Show API key'}
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
          . Sending a message sends your key to OpenRouter for authentication and your conversation to OpenRouter and the selected model provider. Provider charges apply.
        </p>
        <label class="flex items-center gap-3 text-sm text-text-muted min-h-11">
          <input type="checkbox" checked={rememberKey} onChange={(event) => {
            const remember = event.currentTarget.checked;
            setRememberKey(remember);
            persistKey(apiKey, remember);
          }} class="accent-neon-green" />
          Remember key on this device
        </label>
        <div class="flex flex-wrap items-center gap-4 text-xs text-text-muted">
          <span>{rememberKey ? 'Saved in this browser’s local storage.' : 'Key kept in memory for this page.'}</span>
          <button class="min-h-11 text-neon-cyan underline underline-offset-4" onClick={() => {
            setApiKey(''); setRememberKey(false); persistKey('', false);
          }}>Clear key</button>
          <a href="/privacy" class="text-neon-cyan underline underline-offset-4">Privacy details</a>
        </div>
        {storageError && <p role="alert" class="text-sm text-neon-amber">{storageError}</p>}
      </div>

      {/* Controls */}
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex gap-1 bg-surface border border-surface-light rounded-lg p-1">
          <button
            disabled={busy}
            aria-pressed={mode === 'single'}
            onClick={() => switchMode('single')}
            class={`px-3 py-1 rounded font-mono text-xs transition-all ${
              mode === 'single' ? 'bg-neon-green/20 text-neon-green' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            single
          </button>
          <button
            disabled={busy}
            aria-pressed={mode === 'compare'}
            onClick={() => switchMode('compare')}
            class={`px-3 py-1 rounded font-mono text-xs transition-all ${
              mode === 'compare' ? 'bg-neon-cyan/20 text-neon-cyan' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            compare
          </button>
        </div>

        <div class="flex items-center gap-2">
          <label for="chat-temperature" class="font-mono text-xs text-text-muted">temp:</label>
          <input
            id="chat-temperature"
            disabled={busy}
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
          <label for="chat-max-tokens" class="font-mono text-xs text-text-muted">max tokens:</label>
          <select
            id="chat-max-tokens"
            disabled={busy}
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
            <span class="font-mono text-xs text-text-muted">completed replies, est.:</span>
            <span class="font-mono text-xs text-neon-amber">{formatCost(sessionCost)}</span>
          </div>
        )}

        <button
          disabled={busy}
          onClick={clearAll}
          class="px-3 py-1.5 rounded font-mono text-xs bg-surface border border-surface-light text-text-muted hover:text-red-400 transition-colors ml-auto"
        >
          clear chat
        </button>
      </div>

      {mode === 'compare' && <p class="text-xs text-text-muted">Compare sends the same conversation to both selected models. Both requests may be charged to your OpenRouter account.</p>}
      {busy && <button onClick={stopAll} class="min-h-11 px-4 rounded-lg border border-neon-amber/40 text-neon-amber text-sm">Stop responses</button>}

      {/* System prompt */}
      <details class="bg-surface border border-surface-light rounded-lg">
        <summary class="px-4 py-2 font-mono text-xs text-text-muted cursor-pointer hover:text-text-primary">
          System prompt (optional)
        </summary>
        <div class="px-4 pb-4">
          <textarea
            aria-label="System prompt"
            disabled={busy}
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
                aria-label={`Model for chat ${panes.indexOf(pane) + 1}`}
                disabled={busy}
                value={pane.model}
                onChange={(e) => updatePane(pane.id, { model: (e.target as HTMLSelectElement).value, messages: [], messageCosts: {}, error: '' })}
                class="bg-void border border-surface-light rounded px-2 py-1 font-mono text-xs text-text-primary focus:outline-none flex-1 min-w-0"
              >
                {!pane.model && <option value="">Choose a model</option>}
                {models.map((m) => (
                  <option value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
              {pane.loading && <span class="font-mono text-xs text-neon-amber animate-pulse">streaming...</span>}
            </div>

            {/* Messages */}
            <div ref={(element) => { scrollRefs.current[pane.id] = element; }} class="flex-1 overflow-y-auto p-3 space-y-3">
              {pane.messages.length === 0 && (
                <div class="flex items-center justify-center h-full">
                  <p class="font-mono text-sm text-text-muted">Send a message to start chatting.</p>
                </div>
              )}
              {pane.messages.map((msg, i) => (
                <div key={i}>
                  <div class={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      class={`max-w-[85%] rounded-lg px-3 py-2 font-mono text-sm whitespace-pre-wrap [overflow-wrap:anywhere] ${
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
                        estimate: <span class="text-neon-amber">{formatCost(pane.messageCosts[i].total)}</span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {pane.error && (
                <div role="alert" class="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 font-mono text-xs text-red-400">
                  {pane.error}
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div class="flex gap-2">
        <textarea
          aria-label="Chat message"
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKeyDown}
          placeholder="Draft your message here. Add an OpenRouter key when you want to send."
          disabled={busy}
          class="min-w-0 flex-1 bg-surface border border-surface-light rounded-lg px-4 py-3 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50 resize-none disabled:opacity-50"
          rows={2}
        />
        <button
          onClick={sendMessage}
          disabled={!apiKey || !input.trim() || busy || !modelsReady}
          class="px-6 py-3 rounded-lg font-mono text-sm bg-neon-green/20 border border-neon-green text-neon-green hover:bg-neon-green/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed self-end"
        >
          send
        </button>
      </div>
      <p class="text-xs text-text-muted leading-relaxed">Costs shown are estimates for completed text replies. They use provider token counts when returned, otherwise a rough text estimate. Cached tokens, reasoning, routing and interrupted requests can change the bill. Your provider's usage record is the source of truth.</p>
    </div>
  );
}
