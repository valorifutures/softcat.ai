import { useState, useEffect } from 'preact/hooks';
import { estimateTokens } from '../../utils/tokens';

interface SavedPrompt {
  name: string;
  system: string;
  user: string;
  assistant: string;
  vars: Record<string, string>;
  timestamp: number;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  inputPrice: number;
  outputPrice: number;
}

const builtInTemplates: Record<string, Omit<SavedPrompt, 'timestamp'>> = {
  'RAG System': {
    name: 'RAG System',
    system: 'You are a helpful assistant. Answer questions based ONLY on the provided context. If the context does not contain the answer, say "I don\'t have enough information to answer that."',
    user: 'Context:\n"""\n{{context}}\n"""\n\nQuestion: {{question}}',
    assistant: 'Based on the provided context,',
    vars: { context: '', question: '' },
  },
  'Code Reviewer': {
    name: 'Code Reviewer',
    system: 'You are a senior {{language}} developer performing a thorough code review. Focus on:\n1. Correctness and edge cases\n2. Performance implications\n3. Security concerns\n4. Code readability\n\nBe specific. Reference line numbers. Suggest fixes.',
    user: 'Review this {{language}} code:\n\n```{{language}}\n{{code}}\n```',
    assistant: '',
    vars: { language: 'Python', code: '' },
  },
  'JSON Extractor': {
    name: 'JSON Extractor',
    system: 'You extract structured data from unstructured text. Always respond with valid JSON matching the schema provided. No additional text or explanation.',
    user: 'Extract the following fields from the text below:\n\nSchema: {{schema}}\n\nText:\n"""\n{{text}}\n"""',
    assistant: '{',
    vars: { schema: '{"name": string, "date": string, "amount": number}', text: '' },
  },
  'Chain of Thought': {
    name: 'Chain of Thought',
    system: 'You are a careful analytical thinker. Break down problems step by step. Show your reasoning before giving a final answer. If you are unsure about any step, say so.',
    user: '{{problem}}\n\nThink through this step by step.',
    assistant: 'Let me work through this step by step.\n\nStep 1:',
    vars: { problem: '' },
  },
  'Persona Chat': {
    name: 'Persona Chat',
    system: 'You are {{persona}}. Stay in character at all times. Respond as this person would, using their speech patterns, knowledge, and personality. Never break character.',
    user: '{{message}}',
    assistant: '',
    vars: { persona: 'a grumpy but brilliant Unix sysadmin from the 1990s', message: '' },
  },
  'Text Analysis': {
    name: 'Text Analysis',
    system: 'You are an analytical assistant. Be thorough and structured in your analysis.',
    user: 'Analyse the following text:\n\n"{{text}}"\n\nFocus on: {{focus}}',
    assistant: '',
    vars: { text: '', focus: 'tone, key arguments, and potential biases' },
  },
  'Data Transformation': {
    name: 'Data Transformation',
    system: 'You are a data engineer. Write efficient, correct transformations.',
    user: 'Transform the following {{input_format}} data to {{output_format}}:\n\n```\n{{data}}\n```\n\nAdditional rules: {{rules}}',
    assistant: '',
    vars: { input_format: 'JSON', output_format: 'CSV', data: '', rules: 'none' },
  },
  'Explain Concept': {
    name: 'Explain Concept',
    system: 'You are a technical educator. Explain concepts clearly with practical examples. Target audience: {{audience}}.',
    user: 'Explain {{concept}} in {{depth}}.\n\nInclude a practical example.',
    assistant: '',
    vars: { concept: '', depth: 'moderate detail', audience: 'intermediate developers' },
  },
};

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

export default function PromptWorkbench({ models }: { models: ModelInfo[] }) {
  const [system, setSystem] = useState('');
  const [user, setUser] = useState('');
  const [assistant, setAssistant] = useState('');
  const [vars, setVars] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<SavedPrompt[]>([]);
  const [promptName, setPromptName] = useState('');
  const [copied, setCopied] = useState('');
  const [activeTab, setActiveTab] = useState<'editor' | 'templates' | 'saved'>('editor');
  const [exportModelId, setExportModelId] = useState(models.length > 0 ? models[0].id : '');

  const selectedModel = models.find((m) => m.id === exportModelId) || models[0] || { id: '', name: 'Unknown', inputPrice: 0, outputPrice: 0 };

  useEffect(() => {
    try {
      const data = localStorage.getItem('softcat-workbench');
      if (data) setSaved(JSON.parse(data));
    } catch {}
  }, []);

  // Extract variables from all fields
  const allText = system + user + assistant;
  const varMatches = allText.match(/\{\{(\w+)\}\}/g) || [];
  const varKeys = [...new Set(varMatches.map((m) => m.slice(2, -2)))];

  const filledSystem = fillTemplate(system, vars);
  const filledUser = fillTemplate(user, vars);
  const filledAssistant = fillTemplate(assistant, vars);

  const tokens = {
    system: estimateTokens(filledSystem),
    user: estimateTokens(filledUser),
    assistant: estimateTokens(filledAssistant),
    total: estimateTokens(filledSystem + filledUser + filledAssistant),
  };

  const loadTemplate = (t: Omit<SavedPrompt, 'timestamp'>) => {
    setSystem(t.system);
    setUser(t.user);
    setAssistant(t.assistant);
    setVars({ ...t.vars });
    setPromptName(t.name);
    setActiveTab('editor');
  };

  const savePrompt = () => {
    if (!promptName) return;
    const prompt: SavedPrompt = { name: promptName, system, user, assistant, vars, timestamp: Date.now() };
    const updated = [...saved.filter((s) => s.name !== promptName), prompt];
    setSaved(updated);
    localStorage.setItem('softcat-workbench', JSON.stringify(updated));
  };

  const deletePrompt = (name: string) => {
    const updated = saved.filter((s) => s.name !== name);
    setSaved(updated);
    localStorage.setItem('softcat-workbench', JSON.stringify(updated));
  };

  const exportAs = (format: string) => {
    let text = '';
    if (format === 'text') {
      text = `[System]\n${filledSystem}\n\n[User]\n${filledUser}`;
      if (filledAssistant) text += `\n\n[Assistant prefill]\n${filledAssistant}`;
    } else if (format === 'json') {
      const messages: any[] = [{ role: 'user', content: filledUser }];
      if (filledAssistant) messages.push({ role: 'assistant', content: filledAssistant });
      text = JSON.stringify({ system: filledSystem, messages }, null, 2);
    } else if (format === 'curl') {
      const messages: any[] = [{ role: 'user', content: filledUser }];
      if (filledAssistant) messages.push({ role: 'assistant', content: filledAssistant });
      text = `curl -X POST https://api.anthropic.com/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '${JSON.stringify({ model: selectedModel.id, max_tokens: 4096, system: filledSystem, messages })}'`;
    }
    navigator.clipboard.writeText(text);
    setCopied(format);
    setTimeout(() => setCopied(''), 2000);
  };

  const openInPlayground = () => {
    localStorage.setItem('softcat-workbench-handoff', JSON.stringify({ system: filledSystem }));
    window.location.href = '/lab/chat-playground';
  };

  return (
    <div class="space-y-4">
      {/* Tabs */}
      <div class="flex gap-2 border-b border-surface-light pb-2">
        {(['editor', 'templates', 'saved'] as const).map((tab) => (
          <button
            onClick={() => setActiveTab(tab)}
            class={`px-3 py-1.5 rounded-t font-mono text-xs transition-all ${
              activeTab === tab
                ? 'bg-surface border border-surface-light border-b-void text-neon-green'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab}
            {tab === 'saved' && saved.length > 0 && ` (${saved.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'templates' && (
        <div class="grid gap-3">
          {Object.entries(builtInTemplates).map(([key, t]) => (
            <button
              onClick={() => loadTemplate(t)}
              class="block text-left bg-surface border border-surface-light rounded-lg p-4 card-glow"
            >
              <div class="font-mono text-sm font-bold text-text-bright">{t.name}</div>
              <div class="font-mono text-xs text-text-muted mt-1 truncate">{t.system.slice(0, 100)}...</div>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'saved' && (
        <div class="grid gap-3">
          {saved.length === 0 ? (
            <div class="bg-surface border border-surface-light rounded-lg p-6 text-center">
              <p class="font-mono text-sm text-text-muted">No saved prompts yet. Build one and save it.</p>
            </div>
          ) : (
            saved.map((s) => (
              <div class="flex items-center gap-3 bg-surface border border-surface-light rounded-lg p-4">
                <button onClick={() => loadTemplate(s)} class="flex-1 text-left">
                  <div class="font-mono text-sm font-bold text-text-bright">{s.name}</div>
                  <div class="font-mono text-xs text-text-muted mt-1">
                    {new Date(s.timestamp).toLocaleDateString('en-GB')}
                  </div>
                </button>
                <button
                  onClick={() => deletePrompt(s.name)}
                  class="font-mono text-xs text-text-muted hover:text-red-400 transition-colors px-2"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'editor' && (
        <>
          {/* Variables */}
          {varKeys.length > 0 && (
            <div class="bg-surface border border-surface-light rounded-lg p-4 space-y-3">
              <div class="font-mono text-xs text-text-muted uppercase tracking-wider">Variables detected</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {varKeys.map((key) => (
                  <div>
                    <label class="font-mono text-xs text-neon-purple block mb-1">{`{{${key}}}`}</label>
                    <input
                      type="text"
                      value={vars[key] || ''}
                      onInput={(e) => setVars((prev) => ({ ...prev, [key]: (e.target as HTMLInputElement).value }))}
                      class="w-full bg-void border border-surface-light rounded px-3 py-1.5 font-mono text-sm text-text-primary focus:outline-none focus:border-neon-green/50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System prompt */}
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="font-mono text-xs text-neon-green">System prompt</label>
              <span class="font-mono text-xs text-text-muted">~{tokens.system} tokens</span>
            </div>
            <textarea
              value={system}
              onInput={(e) => setSystem((e.target as HTMLTextAreaElement).value)}
              class="w-full h-32 bg-surface border border-surface-light rounded-lg p-3 font-mono text-sm text-text-primary focus:outline-none focus:border-neon-green/50 resize-y"
              placeholder="System instructions..."
            />
          </div>

          {/* User prompt */}
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="font-mono text-xs text-neon-cyan">User prompt</label>
              <span class="font-mono text-xs text-text-muted">~{tokens.user} tokens</span>
            </div>
            <textarea
              value={user}
              onInput={(e) => setUser((e.target as HTMLTextAreaElement).value)}
              class="w-full h-40 bg-surface border border-surface-light rounded-lg p-3 font-mono text-sm text-text-primary focus:outline-none focus:border-neon-green/50 resize-y"
              placeholder="Your prompt..."
            />
          </div>

          {/* Assistant prefill */}
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="font-mono text-xs text-neon-amber">Assistant prefill (optional)</label>
              <span class="font-mono text-xs text-text-muted">~{tokens.assistant} tokens</span>
            </div>
            <textarea
              value={assistant}
              onInput={(e) => setAssistant((e.target as HTMLTextAreaElement).value)}
              class="w-full h-20 bg-surface border border-surface-light rounded-lg p-3 font-mono text-sm text-text-primary focus:outline-none focus:border-neon-green/50 resize-y"
              placeholder="Start the assistant's response with..."
            />
          </div>

          {/* Token total and actions */}
          <div class="flex flex-wrap items-center justify-between gap-4 bg-surface border border-surface-light rounded-lg p-4">
            <div class="font-mono text-sm">
              <span class="text-text-muted">Total: </span>
              <span class="text-text-bright font-bold">~{tokens.total} tokens</span>
              <span class="text-text-muted ml-2">(~${((tokens.total / 1_000_000) * selectedModel.inputPrice).toFixed(4)} on {selectedModel.name})</span>
            </div>

            <div class="flex items-center gap-2">
              <select
                value={exportModelId}
                onChange={(e) => setExportModelId((e.target as HTMLSelectElement).value)}
                class="bg-void border border-surface-light rounded px-2 py-1.5 font-mono text-xs text-text-primary focus:outline-none focus:border-neon-green/50"
              >
                {models.map((m) => (
                  <option value={m.id}>{m.name} ({m.provider})</option>
                ))}
              </select>
              {['text', 'json', 'curl'].map((fmt) => (
                <button
                  onClick={() => exportAs(fmt)}
                  class={`px-3 py-1.5 rounded font-mono text-xs transition-all ${
                    copied === fmt
                      ? 'bg-neon-green/20 border border-neon-green text-neon-green'
                      : 'bg-void border border-surface-light text-text-muted hover:text-text-primary'
                  }`}
                >
                  {copied === fmt ? 'copied!' : fmt}
                </button>
              ))}
              <button
                onClick={openInPlayground}
                class="px-3 py-1.5 rounded font-mono text-xs transition-all bg-void border border-surface-light text-neon-cyan hover:bg-neon-cyan/10 hover:border-neon-cyan/30"
              >
                open in playground
              </button>
            </div>
          </div>

          {/* Save */}
          <div class="flex gap-2">
            <input
              type="text"
              value={promptName}
              onInput={(e) => setPromptName((e.target as HTMLInputElement).value)}
              placeholder="Prompt name..."
              class="flex-1 bg-surface border border-surface-light rounded px-3 py-1.5 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50"
            />
            <button
              onClick={savePrompt}
              class="px-4 py-1.5 rounded font-mono text-xs bg-surface border border-neon-green/30 text-neon-green hover:bg-neon-green/10 transition-all"
            >
              save
            </button>
          </div>
        </>
      )}
    </div>
  );
}
