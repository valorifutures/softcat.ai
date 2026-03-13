import { useState } from 'preact/hooks';

interface Tool {
  id: string;
  name: string;
  description: string;
  stat: string;
  href: string;
  icon: string;
  category: string;
  addedDate: string;
}

const categories = [
  { id: 'all', label: 'All', color: 'purple' },
  { id: 'prompts', label: 'Prompt Engineering', color: 'amber' },
  { id: 'models', label: 'Model Intelligence', color: 'cyan' },
  { id: 'cost', label: 'Cost & Tokens', color: 'green' },
  { id: 'validation', label: 'Validation', color: 'purple' },
] as const;

type CategoryColor = typeof categories[number]['color'];

const colorMap: Record<string, { glow: string; text: string; border: string; bg: string; dot: string; hex: string }> = {
  amber: {
    glow: 'card-glow-amber',
    text: 'text-neon-amber',
    border: 'border-l-neon-amber/40',
    bg: 'bg-neon-amber/10',
    dot: 'rgba(212, 165, 74, ',
    hex: '#d4a54a',
  },
  cyan: {
    glow: 'card-glow-cyan',
    text: 'text-neon-cyan',
    border: 'border-l-neon-cyan/40',
    bg: 'bg-neon-cyan/10',
    dot: 'rgba(90, 184, 212, ',
    hex: '#5ab8d4',
  },
  green: {
    glow: 'card-glow-green',
    text: 'text-neon-green',
    border: 'border-l-neon-green/40',
    bg: 'bg-neon-green/10',
    dot: 'rgba(78, 203, 143, ',
    hex: '#4ecb8f',
  },
  purple: {
    glow: 'card-glow-purple',
    text: 'text-neon-purple',
    border: 'border-l-neon-purple/40',
    bg: 'bg-neon-purple/10',
    dot: 'rgba(155, 122, 204, ',
    hex: '#9b7acc',
  },
};

const categoryColorFor = (cat: string): CategoryColor => {
  const found = categories.find((c) => c.id === cat);
  return found ? found.color : 'purple';
};

function isNew(addedDate: string): boolean {
  const added = new Date(addedDate);
  const now = new Date();
  const diffDays = (now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}

export default function ToolShowcase({ tools }: { tools: Tool[] }) {
  const [active, setActive] = useState('all');

  const filtered = active === 'all' ? tools : tools.filter((t) => t.category === active);

  return (
    <div>
      {/* Category tabs */}
      <div class="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => {
          const isActive = active === cat.id;
          const colors = colorMap[cat.color];
          return (
            <button
              key={cat.id}
              onClick={() => setActive(cat.id)}
              class={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer border ${
                isActive
                  ? `${colors.bg} ${colors.text} border-current`
                  : 'bg-surface border-surface-light text-text-muted hover:text-text-bright hover:border-surface-light'
              }`}
            >
              <span
                class="inline-block w-1.5 h-1.5 rounded-full mr-2"
                style={isActive ? { backgroundColor: `${colors.dot}1)`, boxShadow: `0 0 6px ${colors.dot}0.5)` } : { backgroundColor: 'rgba(173, 173, 196, 0.3)' }}
              />
              {cat.label}
              {cat.id !== 'all' && (
                <span class="ml-1.5 opacity-50">
                  {tools.filter((t) => t.category === cat.id).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tool grid */}
      {filtered.length === 0 ? (
        <div class="bg-surface border border-surface-light rounded-lg p-8 text-center">
          <p class="font-mono text-sm text-text-muted">No tools in this category yet.</p>
        </div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((tool, index) => {
            const color = categoryColorFor(tool.category);
            const colors = colorMap[color];
            const showNew = isNew(tool.addedDate);

            return (
              <a
                key={tool.id}
                href={tool.href}
                class={`group block relative glass-card rounded-xl ${colors.glow} card-lift border-l-2 ${colors.border} overflow-hidden tool-card`}
                style={{ animationDelay: `${index * 60}ms`, '--tool-accent': colors.hex } as any}
              >
                <div class="p-6">
                  <div class="flex items-start gap-4">
                    <span class={`tool-icon font-mono text-lg ${colors.text} shrink-0 mt-0.5`}>
                      {tool.icon}
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <h3 class="tool-card-title font-mono text-sm font-bold text-text-bright transition-colors">
                          {tool.name}
                        </h3>
                        {showNew && (
                          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neon-green/15 text-neon-green border border-neon-green/20">
                            NEW
                          </span>
                        )}
                      </div>
                      <p class="text-sm text-text-muted mt-1.5 leading-relaxed">
                        {tool.description}
                      </p>
                      {/* Quick stat — desktop hover reveal */}
                      <p class={`font-mono text-xs ${colors.text} mt-2 opacity-50 group-hover:opacity-100 transition-opacity hidden md:block`}>
                        ▸ {tool.stat}
                      </p>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
