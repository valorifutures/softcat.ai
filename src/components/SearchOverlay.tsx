import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

interface SearchEntry {
  title: string;
  summary: string;
  url: string;
  type: string;
  tags?: string[];
  date?: string;
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  news: { label: 'news', color: '#00ff9f' },
  thought: { label: 'thought', color: '#00d4ff' },
  tool: { label: 'tool', color: '#b44aff' },
  prompt: { label: 'prompt', color: '#ffb800' },
  radar: { label: 'radar', color: '#ff3366' },
  page: { label: 'page', color: '#adadc4' },
};

function fuzzyMatch(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Exact substring match scores highest
  if (t.includes(q)) return 100 + (q.length / t.length) * 50;

  // Word-start matching
  const words = t.split(/\s+/);
  let wordScore = 0;
  for (const w of words) {
    if (w.startsWith(q)) wordScore += 80;
    else if (w.includes(q)) wordScore += 40;
  }
  if (wordScore > 0) return wordScore;

  // Character-by-character fuzzy
  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}

function scoreEntry(query: string, entry: SearchEntry): number {
  const titleScore = fuzzyMatch(query, entry.title) * 2;
  const summaryScore = fuzzyMatch(query, entry.summary);
  const tagScore = (entry.tags || []).reduce(
    (best, tag) => Math.max(best, fuzzyMatch(query, tag)),
    0,
  );
  return Math.max(titleScore, summaryScore, tagScore);
}

export default function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchEntry[]>([]);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load index on first open
  useEffect(() => {
    if (open && index.length === 0) {
      fetch('/search-index.json')
        .then((r) => r.json())
        .then((data) => setIndex(data))
        .catch(() => {});
    }
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Expose toggle for external button
  useEffect(() => {
    (window as any).__searchOpen = () => setOpen(true);
  }, []);

  const results = query.length < 2
    ? []
    : index
        .map((e) => ({ entry: e, score: scoreEntry(query, e) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map((r) => r.entry);

  // Reset selection when results change
  useEffect(() => {
    setSelected(0);
  }, [query]);

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[selected] as HTMLElement;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const navigate = useCallback(
    (url: string) => {
      setOpen(false);
      setQuery('');
      window.location.href = url;
    },
    [],
  );

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[selected]) {
      navigate(results[selected].url);
    }
  };

  if (!open) return null;

  return (
    <div
      class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      {/* Backdrop */}
      <div class="absolute inset-0 bg-void/80 backdrop-blur-sm" />

      {/* Modal */}
      <div class="relative w-full max-w-xl mx-4 rounded-xl border border-surface-light/50 bg-surface shadow-2xl overflow-hidden"
        style="box-shadow: 0 0 60px rgba(0, 255, 159, 0.06), 0 25px 50px rgba(0, 0, 0, 0.5)"
      >
        {/* Input */}
        <div class="flex items-center gap-3 px-4 py-3 border-b border-surface-light/50">
          <span class="text-text-muted text-sm shrink-0" style="font-family: var(--font-mono)">
            &gt;
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            onKeyDown={onKeyDown}
            placeholder="Search everything..."
            class="flex-1 bg-transparent text-text-bright text-sm outline-none placeholder:text-text-muted/50"
            style="font-family: var(--font-mono)"
          />
          <kbd class="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-text-muted/60 border border-surface-light/50"
            style="font-family: var(--font-mono)"
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} class="max-h-80 overflow-y-auto">
          {query.length < 2 ? (
            <div class="px-4 py-6 text-center text-text-muted/50 text-sm" style="font-family: var(--font-mono)">
              Start typing to search across all content
            </div>
          ) : results.length === 0 ? (
            <div class="px-4 py-6 text-center text-text-muted/50 text-sm" style="font-family: var(--font-mono)">
              No results for "{query}"
            </div>
          ) : (
            results.map((entry, i) => {
              const meta = TYPE_META[entry.type] || TYPE_META.page;
              return (
                <a
                  key={entry.url + entry.title}
                  href={entry.url}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(entry.url);
                  }}
                  class={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    i === selected
                      ? 'bg-surface-light/60'
                      : 'hover:bg-surface-light/30'
                  }`}
                >
                  <span
                    class="shrink-0 mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full border"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: meta.color,
                      borderColor: meta.color + '40',
                      backgroundColor: meta.color + '10',
                    }}
                  >
                    {meta.label}
                  </span>
                  <div class="min-w-0">
                    <div
                      class="text-sm text-text-bright truncate"
                      style="font-family: var(--font-mono)"
                    >
                      {entry.title}
                    </div>
                    <div class="text-xs text-text-muted/70 truncate mt-0.5">
                      {entry.summary}
                    </div>
                  </div>
                  {entry.date && (
                    <span
                      class="shrink-0 text-[10px] text-text-muted/40 mt-0.5"
                      style="font-family: var(--font-mono)"
                    >
                      {entry.date}
                    </span>
                  )}
                </a>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div class="px-4 py-2 border-t border-surface-light/30 flex items-center gap-4 text-[10px] text-text-muted/40"
          style="font-family: var(--font-mono)"
        >
          <span>&#8593;&#8595; navigate</span>
          <span>&#9166; open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
