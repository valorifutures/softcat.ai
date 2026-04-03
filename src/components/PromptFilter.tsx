import { useState, useMemo } from 'preact/hooks';

interface Prompt {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
}

export default function PromptFilter({ prompts }: { prompts: Prompt[] }) {
  const [active, setActive] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of prompts) cats.add(p.category);
    return Array.from(cats).sort();
  }, [prompts]);

  const filtered = active ? prompts.filter((p) => p.category === active) : prompts;

  return (
    <div>
      <div class="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => setActive(null)}
          class={`px-3 py-1.5 rounded-full font-mono text-xs transition-colors ${
            active === null
              ? 'bg-neon-amber/20 text-neon-amber border border-neon-amber/40'
              : 'bg-surface border border-surface-light text-text-muted hover:text-text-bright hover:border-neon-amber/30'
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActive(active === cat ? null : cat)}
            class={`px-3 py-1.5 rounded-full font-mono text-xs transition-colors ${
              active === cat
                ? 'bg-neon-amber/20 text-neon-amber border border-neon-amber/40'
                : 'bg-surface border border-surface-light text-text-muted hover:text-text-bright hover:border-neon-amber/30'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div class="grid gap-5 ambient-glow" style="--glow-color: rgba(212, 165, 74, 0.035); --glow-color-alt: rgba(90, 184, 212, 0.025)">
        {filtered.map((entry, index) => (
          <div
            key={entry.id}
            class="relative glass-card rounded-xl card-glow card-glow-amber card-lift group animate-stagger border-l-2 border-l-neon-amber/40 overflow-hidden"
            style={`--stagger-index: ${index}`}
          >
            <a href={`/prompts/${entry.id}`} class="block p-6 md:p-7">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <h2 class="font-mono text-base font-bold text-text-bright group-hover:text-neon-amber transition-colors">
                    {entry.title}
                  </h2>
                  <p class="text-sm text-text-muted mt-2 leading-relaxed">{entry.description}</p>
                </div>
                <span class="shrink-0 px-2 py-0.5 rounded text-xs font-mono bg-neon-amber/10 text-neon-amber">
                  {entry.category}
                </span>
              </div>
            </a>
            {entry.tags.length > 0 && (
              <div class="flex flex-wrap gap-2 px-6 md:px-7 pb-5">
                {entry.tags.map((tag) => (
                  <span key={tag} class="tag-badge">
                    <span class="tag-dot"></span>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div class="bg-surface border border-surface-light rounded-lg p-8 text-center">
            <p class="font-mono text-sm text-text-muted">
              <span class="text-neon-amber">&#9679;</span> no prompts in this category
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
