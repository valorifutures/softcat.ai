import { useState, useEffect, useRef } from 'preact/hooks';

const API = import.meta.env.PUBLIC_API_URL || 'https://api.softcat.ai';

const examples = [
  'Check Hacker News every morning for AI news and email me a summary',
  'Monitor a GitHub repo for new releases and save summaries to a file',
  'Read my RSS feeds daily and generate a newsletter draft',
];

type View = 'gate' | 'input' | 'designer' | 'building' | 'result';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Stage {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  detail: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const fetchApi = (path: string, opts: RequestInit = {}) =>
  fetch(`${API}${path}`, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });

export default function AgentSpawner() {
  const [view, setView] = useState<View>('gate');
  const [user, setUser] = useState<User | null>(null);
  const [gateMsg, setGateMsg] = useState('');
  const [gateStatus, setGateStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Input
  const [description, setDescription] = useState('');

  // Designer
  const [designerSessionId, setDesignerSessionId] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [designComplete, setDesignComplete] = useState(false);
  const [scanResult, setScanResult] = useState<Record<string, unknown> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Building
  const [stages, setStages] = useState<Stage[]>([
    { id: 'scanning', label: 'Scanning', status: 'pending', detail: '' },
    { id: 'orchestrating', label: 'Orchestrating', status: 'pending', detail: '' },
    { id: 'fabricating', label: 'Fabricating', status: 'pending', detail: '' },
    { id: 'testing', label: 'Testing', status: 'pending', detail: '' },
  ]);
  const [buildError, setBuildError] = useState('');

  // Result
  const [jobId, setJobId] = useState('');
  const [agentName, setAgentName] = useState('');
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('agent.py');

  // Check session on mount + handle magic link token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      // Magic link login
      window.history.replaceState({}, '', window.location.pathname);
      fetchApi('/api/spawn/login', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
            setView('input');
          } else {
            setGateMsg('Login link is invalid or expired. Request a new one.');
            setGateStatus('error');
          }
        })
        .catch(() => {
          setGateMsg('Login failed. Try again.');
          setGateStatus('error');
        });
    } else {
      // Check existing session
      fetchApi('/api/spawn/me')
        .then((r) => {
          if (r.ok) return r.json();
          throw new Error();
        })
        .then((data) => {
          setUser(data);
          setView('input');
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // --- Gate ---

  const [gateName, setGateName] = useState('');
  const [gateEmail, setGateEmail] = useState('');

  async function handleAccessRequest(e: Event) {
    e.preventDefault();
    setGateStatus('sending');
    setGateMsg('');

    try {
      const res = await fetchApi('/api/spawn/access', {
        method: 'POST',
        body: JSON.stringify({ name: gateName, email: gateEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.status === 'link_sent') {
          setGateMsg('You already have access. Check your email for a login link.');
        } else {
          setGateMsg('Request received. We will email you when approved.');
        }
        setGateStatus('sent');
      } else {
        setGateMsg(data.detail || 'Something went wrong.');
        setGateStatus('error');
      }
    } catch {
      setGateMsg('Could not reach the server.');
      setGateStatus('error');
    }
  }

  // --- Designer ---

  async function startDesigner() {
    const res = await fetchApi('/api/spawn/designer/start', { method: 'POST' });
    const data = await res.json();
    setDesignerSessionId(data.session_id);
    setChatMessages([]);
    setDesignComplete(false);
    setScanResult(null);
    setView('designer');
  }

  async function sendDesignerMessage(e: Event) {
    e.preventDefault();
    if (!chatInput.trim() || chatSending) return;

    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setChatSending(true);

    try {
      const res = await fetchApi(`/api/spawn/designer/${designerSessionId}/message`, {
        method: 'POST',
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();

      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);

      if (data.complete) {
        setDesignComplete(true);
        setScanResult(data.scan_result);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Try again.' },
      ]);
    } finally {
      setChatSending(false);
    }
  }

  // --- Spawn ---

  async function startBuild(fromDesigner = false) {
    const body: Record<string, string> = {};
    if (fromDesigner && designerSessionId) {
      body.designer_session_id = designerSessionId;
      body.description = '';
    } else {
      body.description = description.trim();
    }

    setStages([
      { id: 'scanning', label: 'Scanning', status: 'pending', detail: '' },
      { id: 'orchestrating', label: 'Orchestrating', status: 'pending', detail: '' },
      { id: 'fabricating', label: 'Fabricating', status: 'pending', detail: '' },
      { id: 'testing', label: 'Testing', status: 'pending', detail: '' },
    ]);
    setBuildError('');
    setView('building');

    try {
      const res = await fetchApi('/api/spawn/run', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setBuildError(data?.detail || 'Failed to start build');
        return;
      }

      const data = await res.json();
      const jid = data.job_id;
      setJobId(jid);

      // Connect to SSE
      const evtSource = new EventSource(`${API}/api/spawn/run/${jid}/stream`, {
        withCredentials: true,
      });

      evtSource.onmessage = (event) => {
        const evt = JSON.parse(event.data);

        if (evt.stage === 'complete') {
          evtSource.close();
          loadResult(jid);
          return;
        }

        if (evt.stage === 'error') {
          evtSource.close();
          setBuildError(evt.detail || 'Build failed');
          return;
        }

        setStages((prev) =>
          prev.map((s) => {
            if (s.id === evt.stage) {
              return { ...s, status: evt.status, detail: evt.detail };
            }
            return s;
          })
        );
      };

      evtSource.onerror = () => {
        evtSource.close();
      };
    } catch {
      setBuildError('Could not start build');
    }
  }

  async function loadResult(jid: string) {
    try {
      const res = await fetchApi(`/api/spawn/run/${jid}/files`);
      const data = await res.json();
      setAgentName(data.agent_name || 'agent');
      setFiles(data.files || {});
      setActiveTab('agent.py');
      setView('result');
    } catch {
      setBuildError('Build complete but failed to load files');
    }
  }

  function resetForNewBuild() {
    setDescription('');
    setDesignerSessionId('');
    setChatMessages([]);
    setDesignComplete(false);
    setScanResult(null);
    setJobId('');
    setView('input');
  }

  // --- Render ---

  if (view === 'gate') {
    return (
      <div>
        <div class="mb-6">
          <p class="text-text-muted text-sm mb-4">
            Request access to build AI agents. We review every request and email you a login link.
          </p>
        </div>

        <form onSubmit={handleAccessRequest} class="space-y-4 max-w-md">
          <div>
            <label class="font-mono text-xs text-text-muted block mb-1.5">name</label>
            <input
              type="text"
              value={gateName}
              onInput={(e) => setGateName((e.target as HTMLInputElement).value)}
              placeholder="Ada Lovelace"
              required
              class="w-full bg-void border border-surface-light rounded-lg px-4 py-2.5 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50"
            />
          </div>
          <div>
            <label class="font-mono text-xs text-text-muted block mb-1.5">email</label>
            <input
              type="email"
              value={gateEmail}
              onInput={(e) => setGateEmail((e.target as HTMLInputElement).value)}
              placeholder="ada@example.com"
              required
              class="w-full bg-void border border-surface-light rounded-lg px-4 py-2.5 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50"
            />
          </div>
          <button
            type="submit"
            disabled={gateStatus === 'sending'}
            class="px-6 py-2.5 rounded-lg font-mono text-sm bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/30 transition-all"
          >
            {gateStatus === 'sending' ? 'requesting...' : 'request access'}
          </button>
        </form>

        {gateMsg && (
          <p
            class={`font-mono text-xs mt-4 ${
              gateStatus === 'sent' ? 'text-neon-green' : 'text-neon-amber'
            }`}
          >
            {gateMsg}
          </p>
        )}
      </div>
    );
  }

  if (view === 'input') {
    const charCount = description.length;
    const valid = charCount >= 20 && charCount <= 2000;

    return (
      <div>
        <div class="font-mono text-xs text-text-muted mb-6 flex items-center gap-2">
          <span class="text-neon-green">{user?.name}</span>
          <span class="text-text-muted">@</span>
          <span class="text-neon-cyan">softcat.ai</span>
          <span class="text-text-muted ml-auto cursor-pointer hover:text-neon-amber" onClick={() => { fetchApi('/api/spawn/logout', { method: 'POST' }); setUser(null); setView('gate'); }}>
            logout
          </span>
        </div>

        {/* Examples */}
        <div class="mb-6">
          <p class="font-mono text-xs text-text-muted mb-3">Try an example:</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {examples.map((ex) => (
              <button
                type="button"
                onClick={() => setDescription(ex)}
                class="text-left bg-surface border border-surface-light rounded-lg px-3 py-2.5 font-mono text-xs text-text-muted hover:text-neon-cyan hover:border-neon-cyan/30 transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div class="mb-5">
          <label class="font-mono text-xs text-text-muted block mb-1.5">
            what do you want your agent to do?
          </label>
          <textarea
            value={description}
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            placeholder="Describe the agent: what data it reads, what it produces, how often it runs..."
            rows={5}
            class="w-full bg-void border border-surface-light rounded-lg px-4 py-3 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50 resize-y"
          />
          <div class="flex justify-between mt-1.5">
            <span class="font-mono text-xs text-text-muted">
              {charCount > 0 && charCount < 20 && (
                <span class="text-neon-amber">{20 - charCount} more characters needed</span>
              )}
            </span>
            <span
              class={`font-mono text-xs ${charCount > 1800 ? 'text-neon-amber' : 'text-text-muted'}`}
            >
              {charCount}/2000
            </span>
          </div>
        </div>

        {/* Actions */}
        <div class="flex gap-3">
          <button
            onClick={() => startBuild(false)}
            disabled={!valid}
            class={`px-6 py-2.5 rounded-lg font-mono text-sm transition-all ${
              valid
                ? 'bg-neon-green/20 border border-neon-green/40 text-neon-green hover:bg-neon-green/30'
                : 'bg-surface border border-surface-light text-text-muted cursor-not-allowed'
            }`}
          >
            build
          </button>
          <button
            onClick={startDesigner}
            class="px-6 py-2.5 rounded-lg font-mono text-sm bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/30 transition-all"
          >
            design with help
          </button>
        </div>
      </div>
    );
  }

  if (view === 'designer') {
    return (
      <div class="flex flex-col" style={{ height: '600px' }}>
        <div class="font-mono text-xs text-text-muted mb-3 flex items-center gap-2">
          <span class="text-neon-cyan">designer</span>
          <span class="text-text-muted">—</span>
          <span>describe your agent through conversation</span>
          <span
            class="ml-auto cursor-pointer hover:text-neon-amber"
            onClick={resetForNewBuild}
          >
            cancel
          </span>
        </div>

        {/* Chat messages */}
        <div class="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
          {chatMessages.length === 0 && (
            <p class="font-mono text-xs text-text-muted italic">
              Start by describing what you want your agent to do...
            </p>
          )}
          {chatMessages.map((msg, i) => (
            <div
              key={i}
              class={`font-mono text-sm p-3 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-neon-green/5 border border-neon-green/20 text-text-primary ml-8'
                  : 'bg-surface border border-surface-light text-text-primary mr-8'
              }`}
            >
              <span class={`text-xs block mb-1 ${msg.role === 'user' ? 'text-neon-green' : 'text-neon-cyan'}`}>
                {msg.role === 'user' ? 'you' : 'softcat'}
              </span>
              <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Design complete banner */}
        {designComplete && (
          <div class="bg-neon-green/10 border border-neon-green/30 rounded-lg p-4 mb-3">
            <p class="font-mono text-sm text-neon-green mb-2">Design complete</p>
            <p class="font-mono text-xs text-text-muted mb-3">
              {scanResult?.suggested_name as string} — {scanResult?.summary as string}
            </p>
            <button
              onClick={() => startBuild(true)}
              class="px-5 py-2 rounded-lg font-mono text-sm bg-neon-green/20 border border-neon-green/40 text-neon-green hover:bg-neon-green/30 transition-all"
            >
              build this agent
            </button>
          </div>
        )}

        {/* Chat input */}
        {!designComplete && (
          <form onSubmit={sendDesignerMessage} class="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onInput={(e) => setChatInput((e.target as HTMLInputElement).value)}
              placeholder="Describe your agent..."
              disabled={chatSending}
              class="flex-1 bg-void border border-surface-light rounded-lg px-4 py-2.5 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-cyan/50"
            />
            <button
              type="submit"
              disabled={chatSending || !chatInput.trim()}
              class="px-5 py-2.5 rounded-lg font-mono text-sm bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/30 transition-all"
            >
              {chatSending ? '...' : 'send'}
            </button>
          </form>
        )}
      </div>
    );
  }

  if (view === 'building') {
    return (
      <div>
        <div class="font-mono text-xs text-text-muted mb-6">
          <span class="text-neon-green">spawning agent</span>
          <span class="text-text-muted"> — S.O.F.T pipeline</span>
        </div>

        <div class="space-y-3">
          {stages.map((stage) => (
            <div
              key={stage.id}
              class={`flex items-center gap-3 font-mono text-sm py-2 px-3 rounded-lg border ${
                stage.status === 'complete'
                  ? 'border-neon-green/30 text-neon-green'
                  : stage.status === 'running'
                    ? 'border-neon-amber/30 text-neon-amber bg-neon-amber/5'
                    : stage.status === 'failed'
                      ? 'border-red-500/30 text-red-400'
                      : 'border-surface-light text-text-muted'
              }`}
            >
              <span class="w-5 text-center shrink-0">
                {stage.status === 'complete' && '\u2713'}
                {stage.status === 'running' && '\u25B8'}
                {stage.status === 'failed' && '\u2717'}
                {stage.status === 'pending' && '\u00B7'}
              </span>
              <span class="w-28 shrink-0">{stage.label}</span>
              <span class="text-xs opacity-70 truncate">{stage.detail}</span>
            </div>
          ))}
        </div>

        {buildError && (
          <div class="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p class="font-mono text-sm text-red-400">{buildError}</p>
            <button
              onClick={resetForNewBuild}
              class="mt-3 px-4 py-2 rounded-lg font-mono text-xs bg-surface border border-surface-light text-text-muted hover:text-text-primary transition-all"
            >
              try again
            </button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'result') {
    const fileNames = Object.keys(files);
    const currentFile = files[activeTab] || '';

    return (
      <div>
        <div class="font-mono text-xs text-text-muted mb-4 flex items-center gap-2">
          <span class="text-neon-green">\u2713</span>
          <span class="text-neon-green">{agentName}</span>
          <span>built successfully</span>
        </div>

        {/* File tabs */}
        <div class="flex gap-1 mb-3 overflow-x-auto">
          {fileNames.map((fname) => (
            <button
              key={fname}
              onClick={() => setActiveTab(fname)}
              class={`px-3 py-1.5 rounded font-mono text-xs transition-all shrink-0 ${
                fname === activeTab
                  ? 'bg-neon-green/10 border border-neon-green/50 text-neon-green'
                  : 'bg-surface border border-surface-light text-text-muted hover:text-text-primary'
              }`}
            >
              {fname}
            </button>
          ))}
        </div>

        {/* File content */}
        <pre class="bg-void border border-surface-light rounded-lg p-4 font-mono text-xs text-text-primary overflow-x-auto max-h-96 overflow-y-auto">
          {currentFile}
        </pre>

        {/* Actions */}
        <div class="flex gap-3 mt-6">
          <a
            href={`${API}/api/spawn/run/${jobId}/download`}
            class="px-6 py-2.5 rounded-lg font-mono text-sm bg-neon-green/20 border border-neon-green/40 text-neon-green hover:bg-neon-green/30 transition-all inline-block"
          >
            download zip
          </a>
          <button
            onClick={resetForNewBuild}
            class="px-6 py-2.5 rounded-lg font-mono text-sm bg-surface border border-surface-light text-text-muted hover:text-text-primary transition-all"
          >
            build another
          </button>
        </div>
      </div>
    );
  }

  return null;
}
