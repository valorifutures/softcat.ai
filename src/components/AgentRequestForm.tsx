import { useState } from 'preact/hooks';

const API_URL = import.meta.env.PUBLIC_API_URL || 'https://api.softcat.ai';

const examples = [
  'Check Hacker News every morning for AI news and email me a summary',
  'Monitor a GitHub repo for new releases and save summaries to a file',
  'Read my RSS feeds daily and generate a newsletter draft',
];

export default function AgentRequestForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const charCount = description.length;
  const valid = name.trim() && email.trim() && charCount >= 20 && charCount <= 2000;

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!valid || status === 'sending') return;

    setStatus('sending');
    setMessage('');

    try {
      const res = await fetch(`${API_URL}/api/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          description: description.trim(),
        }),
      });

      if (res.ok) {
        setStatus('success');
        setMessage(
          'Request received. We review every request and will email you when your agent is ready.'
        );
        setName('');
        setEmail('');
        setDescription('');
      } else {
        const data = await res.json().catch(() => null);
        setStatus('error');
        setMessage(data?.detail || 'Something went wrong. Try again?');
      }
    } catch {
      setStatus('error');
      setMessage('Could not reach the server. Try again in a moment.');
    }
  }

  return (
    <div>
      {/* Example prompts */}
      <div class="mb-8">
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

      <form onSubmit={handleSubmit} class="space-y-5 max-w-lg">
        {/* Name */}
        <div>
          <label class="font-mono text-xs text-text-muted block mb-1.5">name</label>
          <input
            type="text"
            value={name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
            placeholder="Ada Lovelace"
            required
            class="w-full bg-void border border-surface-light rounded-lg px-4 py-2.5 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50"
          />
        </div>

        {/* Email */}
        <div>
          <label class="font-mono text-xs text-text-muted block mb-1.5">email</label>
          <input
            type="email"
            value={email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
            placeholder="ada@example.com"
            required
            class="w-full bg-void border border-surface-light rounded-lg px-4 py-2.5 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50"
          />
        </div>

        {/* Description */}
        <div>
          <label class="font-mono text-xs text-text-muted block mb-1.5">
            describe your agent
          </label>
          <textarea
            value={description}
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            placeholder="What should it do? Where does it get data? What should it output? How often should it run?"
            required
            minLength={20}
            maxLength={2000}
            rows={6}
            class="w-full bg-void border border-surface-light rounded-lg px-4 py-3 font-mono text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-neon-green/50 resize-y"
          />
          <div class="flex justify-between mt-1.5">
            <span class="font-mono text-xs text-text-muted">
              {charCount < 20 && charCount > 0 && (
                <span class="text-neon-amber">{20 - charCount} more characters needed</span>
              )}
            </span>
            <span
              class={`font-mono text-xs ${
                charCount > 1800 ? 'text-neon-amber' : 'text-text-muted'
              }`}
            >
              {charCount}/2000
            </span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!valid || status === 'sending'}
          class={`px-6 py-2.5 rounded-lg font-mono text-sm transition-all ${
            valid && status !== 'sending'
              ? 'bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/30 cursor-pointer'
              : 'bg-surface border border-surface-light text-text-muted cursor-not-allowed'
          }`}
        >
          {status === 'sending' ? 'submitting...' : 'request agent'}
        </button>

        {/* Status message */}
        {message && (
          <p
            class={`font-mono text-xs ${
              status === 'success' ? 'text-neon-green' : 'text-neon-amber'
            }`}
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
