import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import {
  yearToX,
  zoneStartX,
  totalAxisWidth,
  dotCollisionOffsets,
  DEFAULT_AXIS_CONFIG,
  yearToBand,
} from '../lib/horizon-axis';
import type { Band, Stance } from '../lib/horizon-axis';

// Data shapes (mirrors content.config.ts scenarios schema for the runtime
// island — Astro collections feed this via JSON-serialised props).
interface ScenarioStance {
  timeframe: string;
  year?: number | null;
  band?: Band;
  assumptions: string;
  blockers: string;
  implication: string;
}

export interface ScenarioForStrip {
  id: string;
  topic: string;
  themes: string[];
  definition: string;
  contested?: boolean;
  debate_ref?: string;
  accent: 'green' | 'cyan' | 'purple' | 'amber' | 'red';
  optimistic: ScenarioStance;
  pragmatic: ScenarioStance;
  sceptical: ScenarioStance;
}

export interface EventMarker {
  year: number;
  label: string;
}

export interface ShiftChange {
  horizon: string;
  stance: Stance;
  from?: number | null;
  to?: number | null;
  delta_months?: number | null;
}

interface Props {
  scenarios: ScenarioForStrip[];
  events: EventMarker[];
  recentChanges: Record<string, ShiftChange[]>;
  currentYear: number;
}

// Layout constants for the SVG. Chart gets a massive label column on the
// left, then the banded axis to the right. Full-bleed on the page — this
// component doesn't impose outer padding.
const LABEL_COL_W = 240;
const ROW_H = 90;
const AXIS_H = 54;
const HEADER_H = 28;
const DOT_R = 9;
const DOT_GHOST_R = 6;
const ENVELOPE_OPACITY = 0.1;

const STANCE_COLORS: Record<Stance, string> = {
  optimistic: 'var(--color-neon-green, #4ecb8f)',
  pragmatic: 'var(--color-neon-cyan, #5ab8d4)',
  sceptical: 'var(--color-neon-red, #da5e74)',
};

const STANCE_LABEL: Record<Stance, string> = {
  optimistic: 'optimistic',
  pragmatic: 'pragmatic',
  sceptical: 'sceptical',
};

// SVG <text> is painted via the `fill` property, not `color`. Using
// `text-neon-*` here sets CSS `color` only and leaves fill at the SVG
// default (black) — which is invisible on the void background. These
// utilities target fill directly so the massive row labels actually show.
const ROW_ACCENT_CLASS: Record<ScenarioForStrip['accent'], string> = {
  green: 'fill-neon-green',
  cyan: 'fill-neon-cyan',
  purple: 'fill-neon-purple',
  amber: 'fill-neon-amber',
  red: 'fill-neon-red',
};

// Short chart labels. The full scenario.topic would overflow the 240px label
// column at 26px mono (SOFTWARE AUTOMATION = 324px, EDUCATION DISRUPTION = 341px).
// Matches the terminology in the original Five Horizons ASCII mockup.
const DISPLAY_LABEL: Record<string, string> = {
  'AGI': 'AGI',
  'Agentic Work': 'AGENTIC',
  'Robotics': 'ROBOTS',
  'Software Automation': 'SW AUTO',
  'Education Disruption': 'EDUCATION',
};

interface Tooltip {
  kind: 'dot' | 'label';
  scenarioId: string;
  stance?: Stance;
  x: number;
  y: number;
  pinned: boolean;
}

export default function HorizonStrip({
  scenarios,
  events,
  recentChanges,
  currentYear,
}: Props) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [scrollEndReached, setScrollEndReached] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const axis = DEFAULT_AXIS_CONFIG;
  const axisW = totalAxisWidth(axis);
  const totalW = LABEL_COL_W + axisW;
  const chartTop = HEADER_H;
  const chartH = scenarios.length * ROW_H;
  const totalH = chartTop + chartH + AXIS_H;

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Detect horizontal-scroll overflow for the "scroll →" affordance.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setScrollEndReached(scrollLeft + clientWidth >= scrollWidth - 4);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Dismiss pinned tooltip on Escape and on outside click.
  useEffect(() => {
    if (!tooltip?.pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTooltip(null);
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-horizon-interactive]')) {
        setTooltip(null);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [tooltip?.pinned]);

  // Pre-compute dot positions + collision offsets per scenario.
  const dotLayout = useMemo(() => {
    return scenarios.map((s) => {
      const stances: Stance[] = ['optimistic', 'pragmatic', 'sceptical'];
      const positions = stances.map((stance) => {
        const entry = s[stance];
        const band = entry.band ?? yearToBand(entry.year ?? null, currentYear);
        const x = yearToX(entry.year ?? null, band, axis);
        return { stance, x, band };
      });
      const offsets = dotCollisionOffsets(
        positions.map((p) => ({ stance: p.stance, x: p.x })),
      );
      return { positions, offsets };
    });
  }, [scenarios, currentYear, axis]);

  // Filter event markers to those within visible axis range.
  const visibleEvents = useMemo(() => {
    const minYear = axis.nearRange[0] - 1;
    const maxYear = axis.farRange[1];
    return events.filter((e) => e.year >= minYear && e.year <= maxYear);
  }, [events, axis]);

  return (
    <div class="relative">
      <div
        ref={containerRef}
        class="overflow-x-auto overflow-y-visible"
        style="scrollbar-width: thin;"
      >
        <svg
          viewBox={`0 0 ${totalW} ${totalH}`}
          width={totalW}
          height={totalH}
          class="block"
          role="img"
          aria-labelledby="horizon-strip-title horizon-strip-desc"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id="horizon-strip-title">Five Horizons chart</title>
          <desc id="horizon-strip-desc">
            Arrival-year forecasts for five AI futures (AGI, Agentic Work, Robotics,
            Software Automation, Education Disruption) across three worldviews
            (optimistic, pragmatic, sceptical). Plotted on a non-uniform banded axis.
          </desc>

          {/* Zone dividers + labels */}
          {(['near', 'mid', 'far', 'indefinite'] as Band[]).map((band) => {
            const x = LABEL_COL_W + zoneStartX(band, axis);
            const w = axis.widths[band];
            return (
              <g key={`zone-${band}`}>
                {band !== 'near' && (
                  <line
                    x1={x - axis.zoneGap / 2}
                    x2={x - axis.zoneGap / 2}
                    y1={chartTop - 6}
                    y2={chartTop + chartH + 6}
                    stroke="var(--color-surface-light, #1e1e30)"
                    stroke-width="1"
                    stroke-dasharray="3 4"
                  />
                )}
                <text
                  x={x + w / 2}
                  y={chartTop - 12}
                  text-anchor="middle"
                  class="font-mono fill-text-bright"
                  style="font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase;"
                >
                  {band === 'indefinite' ? 'indefinite' : band}
                </text>
              </g>
            );
          })}

          {/* Event markers (past milestones) — thin vertical lines behind rows,
              labels rotated -30deg so adjacent events don't collide horizontally. */}
          {visibleEvents.map((e) => {
            const band = yearToBand(e.year, currentYear);
            if (band === 'indefinite') return null;
            const x = LABEL_COL_W + yearToX(e.year, band, axis);
            return (
              <g key={`event-${e.year}-${e.label}`} opacity="0.35">
                <line
                  x1={x}
                  x2={x}
                  y1={chartTop}
                  y2={chartTop + chartH}
                  stroke="var(--color-text-muted, #6b7280)"
                  stroke-width="1"
                  stroke-dasharray="2 4"
                />
                <text
                  x={x}
                  y={chartTop + chartH + 46}
                  text-anchor="end"
                  transform={`rotate(-30 ${x} ${chartTop + chartH + 46})`}
                  class="font-mono fill-text-muted"
                  style="font-size: 9px;"
                >
                  {e.label}
                </text>
              </g>
            );
          })}

          {/* Year ticks along the axis */}
          {axisYearTicks(axis).map(({ year, band, display }) => {
            const x = LABEL_COL_W + yearToX(year, band, axis);
            return (
              <g key={`tick-${band}-${year}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={chartTop + chartH}
                  y2={chartTop + chartH + 6}
                  stroke="var(--color-text-bright, #e5e7eb)"
                  stroke-width="1"
                  opacity="0.7"
                />
                <text
                  x={x}
                  y={chartTop + chartH + 36}
                  text-anchor="middle"
                  class="font-mono fill-text-bright"
                  style="font-size: 11px;"
                >
                  {display ?? year}
                </text>
              </g>
            );
          })}

          {/* Indefinite column header */}
          <text
            x={LABEL_COL_W + zoneStartX('indefinite', axis) + axis.widths.indefinite / 2}
            y={chartTop + chartH + 36}
            text-anchor="middle"
            class="font-mono fill-text-bright"
            style="font-size: 11px;"
          >
            ???
          </text>

          {/* Rows */}
          {scenarios.map((s, rowIdx) => {
            const rowY = chartTop + rowIdx * ROW_H;
            const rowMidY = rowY + ROW_H / 2;
            const { positions, offsets } = dotLayout[rowIdx];

            // Envelope: rect from leftmost finite dot to rightmost finite dot.
            const finite = positions.filter((p) => p.band !== 'indefinite');
            const envelopeLeft = finite.length
              ? Math.min(...finite.map((p) => p.x))
              : null;
            const envelopeRight = finite.length
              ? Math.max(...finite.map((p) => p.x))
              : null;

            const changes = recentChanges[s.id] ?? [];

            return (
              <g key={`row-${s.id}`}>
                {/* Faint row divider */}
                {rowIdx > 0 && (
                  <line
                    x1={0}
                    x2={totalW}
                    y1={rowY}
                    y2={rowY}
                    stroke="var(--color-surface-light, #1e1e30)"
                    stroke-width="1"
                    opacity="0.3"
                  />
                )}

                {/* Row label (massive mono) — interactive for definition overlay */}
                <g
                  data-horizon-interactive="true"
                  style="cursor: pointer;"
                  tabIndex={0}
                  role="button"
                  aria-label={`${s.topic} — ${s.definition}`}
                  onMouseEnter={(ev) =>
                    setTooltip({
                      kind: 'label',
                      scenarioId: s.id,
                      x: (ev.currentTarget as SVGElement).getBoundingClientRect().right,
                      y: (ev.currentTarget as SVGElement).getBoundingClientRect().top,
                      pinned: false,
                    })
                  }
                  onMouseLeave={() => {
                    if (!tooltip?.pinned) setTooltip(null);
                  }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    setTooltip({
                      kind: 'label',
                      scenarioId: s.id,
                      x: (ev.currentTarget as SVGElement).getBoundingClientRect().right,
                      y: (ev.currentTarget as SVGElement).getBoundingClientRect().top,
                      pinned: true,
                    });
                  }}
                  onFocus={(ev) =>
                    setTooltip({
                      kind: 'label',
                      scenarioId: s.id,
                      x: (ev.currentTarget as SVGElement).getBoundingClientRect().right,
                      y: (ev.currentTarget as SVGElement).getBoundingClientRect().top,
                      pinned: false,
                    })
                  }
                  onBlur={() => {
                    if (!tooltip?.pinned) setTooltip(null);
                  }}
                >
                  <text
                    x={LABEL_COL_W - 16}
                    y={rowMidY + 8}
                    text-anchor="end"
                    class={`font-mono font-bold ${ROW_ACCENT_CLASS[s.accent]}`}
                    style="font-size: 26px; letter-spacing: 0.04em;"
                  >
                    {(DISPLAY_LABEL[s.topic] ?? s.topic).toUpperCase()}
                  </text>
                  {s.contested && (
                    <text
                      x={LABEL_COL_W - 8}
                      y={rowMidY - 14}
                      text-anchor="end"
                      class="fill-neon-amber"
                      style="font-size: 14px;"
                      aria-label="contested definition"
                    >
                      ⚠
                    </text>
                  )}
                </g>

                {/* Confidence envelope */}
                {envelopeLeft != null && envelopeRight != null && envelopeRight > envelopeLeft && (
                  <rect
                    x={LABEL_COL_W + envelopeLeft}
                    y={rowMidY - 18}
                    width={envelopeRight - envelopeLeft}
                    height={36}
                    fill={`var(--color-neon-${s.accent}, #5ab8d4)`}
                    opacity={ENVELOPE_OPACITY}
                    rx={18}
                  />
                )}

                {/* Ghost dots + drift arrows (from recent shifts) */}
                {changes.map((c, ci) => {
                  if (c.from == null || c.to == null) return null;
                  const fromBand = yearToBand(c.from, currentYear);
                  const toBand = yearToBand(c.to, currentYear);
                  if (fromBand === 'indefinite' || toBand === 'indefinite') return null;
                  const xFrom = LABEL_COL_W + yearToX(c.from, fromBand, axis);
                  const xTo = LABEL_COL_W + yearToX(c.to, toBand, axis);
                  const offsetY = offsets[c.stance] ?? 0;
                  return (
                    <g key={`ghost-${s.id}-${c.stance}-${ci}`} opacity="0.5">
                      <circle
                        cx={xFrom}
                        cy={rowMidY + offsetY}
                        r={DOT_GHOST_R}
                        fill="none"
                        stroke={STANCE_COLORS[c.stance]}
                        stroke-width="1.5"
                        stroke-dasharray="2 2"
                      />
                      <line
                        x1={xFrom + DOT_GHOST_R}
                        y1={rowMidY + offsetY}
                        x2={xTo - DOT_R - 2}
                        y2={rowMidY + offsetY}
                        stroke={STANCE_COLORS[c.stance]}
                        stroke-width="1.5"
                        marker-end={`url(#arrow-${c.stance})`}
                      />
                    </g>
                  );
                })}

                {/* Dots */}
                {positions.map((p) => {
                  const cx = LABEL_COL_W + p.x;
                  const cy = rowMidY + (offsets[p.stance] ?? 0);
                  const entry = s[p.stance];
                  const isIndefinite = p.band === 'indefinite';
                  return (
                    <g
                      key={`dot-${s.id}-${p.stance}`}
                      data-horizon-interactive="true"
                      tabIndex={0}
                      role="button"
                      style={`cursor: pointer; animation: horizon-dot-in 600ms ease-out ${rowIdx * 80}ms both;`}
                      aria-label={`${s.topic} ${p.stance}: ${entry.timeframe}`}
                      onMouseEnter={(ev) => {
                        if (tooltip?.pinned) return;
                        const r = (ev.currentTarget as SVGElement).getBoundingClientRect();
                        setTooltip({
                          kind: 'dot',
                          scenarioId: s.id,
                          stance: p.stance,
                          x: r.left + r.width / 2,
                          y: r.top,
                          pinned: false,
                        });
                      }}
                      onMouseLeave={() => {
                        if (!tooltip?.pinned) setTooltip(null);
                      }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        const r = (ev.currentTarget as SVGElement).getBoundingClientRect();
                        setTooltip({
                          kind: 'dot',
                          scenarioId: s.id,
                          stance: p.stance,
                          x: r.left + r.width / 2,
                          y: r.top,
                          pinned: true,
                        });
                      }}
                      onFocus={(ev) => {
                        const r = (ev.currentTarget as SVGElement).getBoundingClientRect();
                        setTooltip({
                          kind: 'dot',
                          scenarioId: s.id,
                          stance: p.stance,
                          x: r.left + r.width / 2,
                          y: r.top,
                          pinned: false,
                        });
                      }}
                      onBlur={() => {
                        if (!tooltip?.pinned) setTooltip(null);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          window.location.href = `/horizon#${s.id}`;
                        }
                      }}
                    >
                      {isIndefinite ? (
                        <rect
                          x={cx - DOT_R}
                          y={cy - DOT_R}
                          width={DOT_R * 2}
                          height={DOT_R * 2}
                          fill="none"
                          stroke={STANCE_COLORS[p.stance]}
                          stroke-width="2"
                          rx="2"
                        />
                      ) : (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={DOT_R}
                          fill={STANCE_COLORS[p.stance]}
                          stroke="var(--color-void, #0c0c14)"
                          stroke-width="2"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Arrow marker defs for drift lines */}
          <defs>
            {(['optimistic', 'pragmatic', 'sceptical'] as Stance[]).map((st) => (
              <marker
                key={`arrow-${st}`}
                id={`arrow-${st}`}
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L6,3 Z" fill={STANCE_COLORS[st]} />
              </marker>
            ))}
          </defs>

          {/* Global styles (animation keyframes) */}
          <style>{`
            @keyframes horizon-dot-in {
              0% { opacity: 0; transform: translateX(-40px); }
              100% { opacity: 1; transform: translateX(0); }
            }
          `}</style>
        </svg>
      </div>

      {/* Scroll affordance */}
      {hydrated && !scrollEndReached && (
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--color-void,#0c0c14)] to-transparent flex items-center justify-end pr-2 font-mono text-xs text-text-muted"
        >
          scroll →
        </div>
      )}

      {/* Tooltip */}
      {hydrated && tooltip && (
        <TooltipView tooltip={tooltip} scenarios={scenarios} recentChanges={recentChanges} />
      )}

      {/* Stance legend */}
      <div class="mt-4 flex items-center gap-6 font-mono text-xs text-text-muted flex-wrap">
        {(['optimistic', 'pragmatic', 'sceptical'] as Stance[]).map((st) => (
          <span class="inline-flex items-center gap-2" key={st}>
            <span
              class="inline-block h-3 w-3 rounded-full"
              style={`background:${STANCE_COLORS[st]};`}
            />
            {STANCE_LABEL[st]}
          </span>
        ))}
        <span class="inline-flex items-center gap-2">
          <span class="inline-block h-3 w-3 rounded-full border border-text-muted/60 border-dashed" />
          ghost dot + drift arrow = change in last 30 days
        </span>
        <span class="inline-flex items-center gap-2">
          <span class="inline-block h-3 w-3 border border-text-muted/60" style="border-radius:2px;" />
          indefinite (no year)
        </span>
      </div>
    </div>
  );
}

function TooltipView({
  tooltip,
  scenarios,
  recentChanges,
}: {
  tooltip: Tooltip;
  scenarios: ScenarioForStrip[];
  recentChanges: Record<string, ShiftChange[]>;
}) {
  const scenario = scenarios.find((s) => s.id === tooltip.scenarioId);
  if (!scenario) return null;

  const stance = tooltip.stance;
  const entry = stance ? scenario[stance] : null;
  const changes = recentChanges[scenario.id] ?? [];
  const driftForStance = stance ? changes.find((c) => c.stance === stance) : null;

  const style = `left:${Math.max(12, tooltip.x - 180)}px; top:${Math.max(12, tooltip.y - 12)}px; transform: translateY(-100%);`;

  return (
    <div
      class="fixed z-50 max-w-sm glass-card rounded-lg p-4 shadow-xl border border-surface-light pointer-events-auto"
      style={style}
      role="dialog"
      aria-modal={tooltip.pinned ? 'true' : undefined}
    >
      <div class="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">
        {scenario.topic}
        {scenario.contested && (
          <span class="ml-2 text-neon-amber">⚠ contested</span>
        )}
      </div>

      {tooltip.kind === 'label' && (
        <>
          <p class="text-sm text-text-bright leading-snug mb-2">
            {scenario.definition}
          </p>
          {scenario.contested && scenario.debate_ref && (
            <a
              href={`/horizon#${scenario.debate_ref}`}
              class="font-mono text-xs text-neon-amber hover:underline"
            >
              See debate →
            </a>
          )}
        </>
      )}

      {tooltip.kind === 'dot' && entry && stance && (
        <>
          <div class="flex items-baseline gap-2 mb-2">
            <span
              class="font-mono text-xs uppercase"
              style={`color:${STANCE_COLORS[stance]};`}
            >
              {STANCE_LABEL[stance]}
            </span>
            <span class="font-mono text-xs text-text-bright">
              {entry.timeframe}
            </span>
          </div>
          <p class="text-xs text-text-muted mb-2 leading-snug">
            {entry.implication}
          </p>
          {driftForStance && driftForStance.from != null && driftForStance.to != null && (
            <p class="font-mono text-[11px] text-neon-amber leading-snug mb-2">
              drift: {driftForStance.from} → {driftForStance.to}
              {driftForStance.delta_months != null && (
                <> ({formatDelta(driftForStance.delta_months)})</>
              )}
            </p>
          )}
          <a
            href={`/horizon#${scenario.id}`}
            class="font-mono text-xs text-neon-cyan hover:underline"
          >
            Read the full scenario →
          </a>
        </>
      )}

      {tooltip.pinned && (
        <button
          type="button"
          class="absolute top-2 right-2 text-text-muted hover:text-text-bright font-mono text-xs"
          aria-label="close tooltip"
          onClick={(e) => {
            e.stopPropagation();
            // Handled by parent via outside-click; nothing to do here, but
            // the button provides a keyboard-reachable dismissal target.
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function formatDelta(months: number): string {
  const abs = Math.abs(months);
  const sign = months > 0 ? 'later' : 'earlier';
  if (abs < 12) return `${abs} mo ${sign}`;
  const years = Math.round(abs / 12);
  return `${years} yr ${sign}`;
}

// Year-axis ticks. NEAR zone gets per-year precision (reader decision window).
// MID/FAR zones collapse to a single band-centred label to avoid collisions
// at zone boundaries (2030/2031 and 2035/2036 were overlapping at 10px font).
function axisYearTicks(
  axis: typeof DEFAULT_AXIS_CONFIG,
): { year: number; band: Band; display?: string }[] {
  const ticks: { year: number; band: Band; display?: string }[] = [];
  for (let y = axis.nearRange[0]; y <= axis.nearRange[1]; y++) {
    ticks.push({ year: y, band: 'near' });
  }
  const midCenter = Math.round((axis.midRange[0] + axis.midRange[1]) / 2);
  ticks.push({
    year: midCenter,
    band: 'mid',
    display: `${axis.midRange[0]}-${axis.midRange[1]}`,
  });
  const farCenter = Math.round((axis.farRange[0] + axis.farRange[1]) / 2);
  ticks.push({
    year: farCenter,
    band: 'far',
    display: `${axis.farRange[0]}+`,
  });
  return ticks;
}
