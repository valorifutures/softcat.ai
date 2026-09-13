import { useState, useEffect, useRef } from 'preact/hooks';
import { searchEntries, validateSearchIndex } from '../lib/site-search.mjs';
import './SearchOverlay.css';

interface SearchEntry { title: string; summary: string; url: string; type: string; tags?: string[]; date?: string; }
const labels: Record<string, string> = { news: 'News archive', thought: 'Notebook & thoughts', tool: 'Interactive tool', guide: 'Tool guide', prompt: 'Prompt', radar: 'Radar archive', glossary: 'Glossary', forecast: 'Forecast', page: 'Page', experiment: 'Experiment' };
const shortcuts = [
  ['Should this be an agent?', '/lab/agent-check'], ['Model comparison', '/lab/model-comparison'],
  ['The build notebook', '/notebook'], ['Explore Horizon', '/horizon'],
];

export default function SearchOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const show = () => { openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setOpen(true); };
    (window as any).__searchOpen = show;
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialogRef.current?.open) setOpen(false); else show();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); if ((window as any).__searchOpen === show) delete (window as any).__searchOpen; };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) { if (dialog.open) dialog.close(); return; }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    inputRef.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = previousOverflow; openerRef.current?.focus({ preventScroll: true }); };
  }, [open]);

  useEffect(() => {
    if (!open || index !== null) return;
    const controller = new AbortController();
    setStatus('loading');
    fetch('/search-index.json', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Index unavailable'); return response.json(); })
      .then(data => { setIndex(validateSearchIndex(data)); setStatus('ready'); })
      .catch(error => { if (error.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, [open, retry]);

  const results: SearchEntry[] = searchEntries(index ?? [], query);
  useEffect(() => { setSelected(0); }, [query, index]);
  useEffect(() => {
    const list = listRef.current;
    const item = list?.children[selected] as HTMLElement | undefined;
    if (!list || !item) return;
    const box = list.getBoundingClientRect(), itemBox = item.getBoundingClientRect();
    if (itemBox.top < box.top) list.scrollTop -= box.top - itemBox.top;
    else if (itemBox.bottom > box.bottom) list.scrollTop += itemBox.bottom - box.bottom;
  }, [selected, query, index]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (results.length) setSelected(value => Math.max(0, Math.min(results.length - 1, value + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (event.key === 'Enter' && results[selected]) {
      event.preventDefault();
      window.location.assign(results[selected].url);
    }
  };

  return <dialog ref={dialogRef} class="site-search" aria-label="Search the site"
    onCancel={event => { event.preventDefault(); setOpen(false); }}
    onClose={() => { setOpen(false); openerRef.current?.focus({ preventScroll: true }); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setOpen(false);
    }}>
    <div class="site-search-heading"><span>FIND SOMETHING USEFUL</span><button type="button" onClick={() => setOpen(false)} aria-label="Close search">Close <span aria-hidden="true">×</span></button></div>
    <label class="site-search-label" for="site-search-query">Search tools, notes and the archive</label>
    <input ref={inputRef} id="site-search-query" type="search" role="combobox" aria-autocomplete="list" aria-controls="site-search-results" aria-expanded={results.length > 0} aria-activedescendant={results[selected] ? `site-search-result-${selected}` : undefined}
      value={query} onInput={event => setQuery(event.currentTarget.value)} onKeyDown={onKeyDown} placeholder="Try agent check, tokens, or Horizon…" autoComplete="off" />
    {status === 'loading' && <p class="site-search-message" role="status">Loading the search index…</p>}
    {status === 'error' && <div class="site-search-message" role="alert"><p>Search could not load. You can try again or use the links below.</p><button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button></div>}
    {(query.trim().length < 2 || status === 'error') && <div class="site-search-shortcuts"><p>Start here</p>{shortcuts.map(([name, href]) => <a href={href}>{name}<span aria-hidden="true">↗</span></a>)}</div>}
    {query.trim().length >= 2 && status === 'ready' && results.length === 0 && <p class="site-search-message" role="status">No matches for “{query}”. Try a shorter term or a topic such as models, prompts or agents.</p>}
    <div ref={listRef} id="site-search-results" role="listbox" aria-label="Search results" class="site-search-results">
      {results.map((entry, i) => <a key={entry.url + entry.title} id={`site-search-result-${i}`} role="option" aria-selected={i === selected} tabIndex={-1} href={entry.url} class="site-search-result" onPointerMove={() => setSelected(i)}>
        <div class="site-search-result-meta"><span>{labels[entry.type] ?? 'Page'}</span>{entry.date && <time datetime={entry.date}>{entry.date}</time>}</div>
        <strong>{entry.title}</strong><p>{entry.summary}</p>
      </a>)}
    </div>
    <div class="site-search-footer"><span>↑ ↓ choose · Enter opens · Esc closes</span><span aria-live="polite">{query.trim().length < 2 ? 'Type at least 2 characters' : status === 'loading' ? 'Loading…' : status === 'error' ? 'Search unavailable' : `${results.length} shown`}</span></div>
  </dialog>;
}
