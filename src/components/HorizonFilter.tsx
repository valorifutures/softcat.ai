import { useEffect, useMemo, useState } from 'preact/hooks';

// DOM controller island for the Horizon Map theme filter.
//
// Cards rendered by horizon.astro carry:
//   data-horizon-card                    — marks the element as filterable
//   data-themes="models,agents,work"     — comma-separated theme list
//   data-horizon-lane="now|next|..."     — lane bucket for empty-state counts
//
// Selection semantics: OR across picked themes. Empty selection shows
// everything. URL is kept in sync via ?themes=a,b using history.replaceState
// so back/forward behaves.

interface Props {
  allThemes: string[];
}

const PARAM = 'themes';

function readUrlThemes(available: Set<string>): string[] {
  if (typeof window === 'undefined') return [];
  const raw = new URLSearchParams(window.location.search).get(PARAM);
  if (!raw) return [];
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => available.has(t));
}

function writeUrlThemes(active: string[]) {
  const url = new URL(window.location.href);
  if (active.length === 0) {
    url.searchParams.delete(PARAM);
  } else {
    url.searchParams.set(PARAM, active.join(','));
  }
  window.history.replaceState(null, '', url.toString());
}

function applyFilter(active: Set<string>) {
  const cards = document.querySelectorAll<HTMLElement>('[data-horizon-card]');
  const laneVisible: Record<string, number> = {};
  const laneTotal: Record<string, number> = {};

  cards.forEach((card) => {
    const themes = (card.dataset.themes ?? '').split(',').filter(Boolean);
    const lane = card.dataset.horizonLane ?? 'unknown';
    laneTotal[lane] = (laneTotal[lane] ?? 0) + 1;
    const match = active.size === 0 || themes.some((t) => active.has(t));
    card.style.display = match ? '' : 'none';
    if (match) laneVisible[lane] = (laneVisible[lane] ?? 0) + 1;
  });

  // Hide Past-lane year headers when every card under them is filtered out.
  document.querySelectorAll<HTMLElement>('[data-horizon-past-year]').forEach((yearBlock) => {
    const anyVisible = yearBlock.querySelectorAll<HTMLElement>('[data-horizon-card]');
    let shown = 0;
    anyVisible.forEach((c) => {
      if (c.style.display !== 'none') shown += 1;
    });
    yearBlock.style.display = shown === 0 ? 'none' : '';
  });

  // Per-lane empty-state messages.
  document.querySelectorAll<HTMLElement>('[data-horizon-empty]').forEach((el) => {
    const lane = el.dataset.horizonEmpty ?? '';
    const hasAny = (laneTotal[lane] ?? 0) > 0;
    const visible = laneVisible[lane] ?? 0;
    el.style.display = hasAny && visible === 0 && active.size > 0 ? '' : 'none';
  });
}

export default function HorizonFilter({ allThemes }: Props) {
  const available = useMemo(() => new Set(allThemes), [allThemes]);
  const [active, setActive] = useState<Set<string>>(new Set());

  // Hydrate from URL on mount.
  useEffect(() => {
    const initial = new Set(readUrlThemes(available));
    setActive(initial);
  }, [available]);

  // Apply to DOM + write URL whenever selection changes.
  useEffect(() => {
    applyFilter(active);
    writeUrlThemes(Array.from(active));
  }, [active]);

  function toggle(theme: string) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(theme)) {
        next.delete(theme);
      } else {
        next.add(theme);
      }
      return next;
    });
  }

  function clear() {
    setActive(new Set());
  }

  const activeCount = active.size;

  return (
    <div class="glass-card rounded-xl p-5 mb-8">
      <div class="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <span class="font-mono text-xs text-neon-cyan uppercase tracking-widest">
          Filter by theme
        </span>
        <span class="font-mono text-[11px] text-text-muted/70">
          {activeCount === 0
            ? 'showing everything'
            : `filtering by ${activeCount} theme${activeCount === 1 ? '' : 's'}`}
          {activeCount > 0 && (
            <button
              type="button"
              onClick={clear}
              class="ml-3 text-neon-amber hover:underline"
            >
              clear
            </button>
          )}
        </span>
      </div>
      <div class="flex flex-wrap gap-2">
        {allThemes.map((theme) => {
          const isActive = active.has(theme);
          return (
            <button
              key={theme}
              type="button"
              onClick={() => toggle(theme)}
              aria-pressed={isActive}
              class={`px-3 py-1 rounded-full font-mono text-xs transition-colors ${
                isActive
                  ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40'
                  : 'bg-surface border border-surface-light text-text-muted hover:text-text-bright hover:border-neon-cyan/30'
              }`}
            >
              {theme}
            </button>
          );
        })}
      </div>
    </div>
  );
}
