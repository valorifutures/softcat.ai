// Banded axis helpers for the Five Horizons strip (/horizon/five).
//
// The chart renders on a non-uniform axis: NEAR (2026-2030) gets full
// per-year precision, MID (2031-2035) reads in 2-year buckets, FAR
// (2036-2045) is a rough zone, INDEFINITE is a pinned right column.
// Fixed pixel width per zone, not proportional to year span. Reader-model
// decision: near-term decisions deserve the screen real estate.
//
// Kept in sync with scripts/validate-horizon-refs.mjs (duplicated there
// because that file is .mjs and cannot import TypeScript).

export type Band = 'near' | 'mid' | 'far' | 'indefinite';
export type Stance = 'optimistic' | 'pragmatic' | 'sceptical';

export const BAND_NEAR_MAX_DELTA = 4;
export const BAND_MID_MAX_DELTA = 9;
export const BAND_FAR_MAX_DELTA = 19;

export function yearToBand(
  year: number | null | undefined,
  currentYear: number,
): Band {
  if (year == null) return 'indefinite';
  const delta = year - currentYear;
  if (delta <= BAND_NEAR_MAX_DELTA) return 'near';
  if (delta <= BAND_MID_MAX_DELTA) return 'mid';
  if (delta <= BAND_FAR_MAX_DELTA) return 'far';
  return 'indefinite';
}

export interface BandedAxisConfig {
  widths: Record<Band, number>;
  nearRange: [number, number];
  midRange: [number, number];
  farRange: [number, number];
  zoneGap: number;
}

export const DEFAULT_AXIS_CONFIG: BandedAxisConfig = {
  widths: { near: 420, mid: 260, far: 300, indefinite: 140 },
  nearRange: [2026, 2030],
  midRange: [2031, 2035],
  farRange: [2036, 2045],
  zoneGap: 12,
};

export function zoneStartX(band: Band, config: BandedAxisConfig): number {
  const { widths, zoneGap } = config;
  if (band === 'near') return 0;
  if (band === 'mid') return widths.near + zoneGap;
  if (band === 'far') return widths.near + zoneGap + widths.mid + zoneGap;
  return widths.near + zoneGap + widths.mid + zoneGap + widths.far + zoneGap;
}

export function totalAxisWidth(config: BandedAxisConfig): number {
  const { widths, zoneGap } = config;
  return widths.near + widths.mid + widths.far + widths.indefinite + zoneGap * 3;
}

export function yearToX(
  year: number | null | undefined,
  band: Band,
  config: BandedAxisConfig,
): number {
  const zs = zoneStartX(band, config);
  if (band === 'indefinite' || year == null) {
    return zs + config.widths.indefinite / 2;
  }
  const range = band === 'near' ? config.nearRange : band === 'mid' ? config.midRange : config.farRange;
  const width = band === 'near' ? config.widths.near : band === 'mid' ? config.widths.mid : config.widths.far;
  const [s, e] = range;
  const frac = clamp((year - s) / (e - s), 0, 1);
  return zs + frac * width;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// When two or three dots in a row crowd the same x, fan them vertically so
// nothing occludes. Returns a per-stance vertical offset in px (positive =
// below row centreline).
export interface DotPosition {
  stance: Stance;
  x: number;
}

const COLLISION_THRESHOLD_PX = 14;
const COLLISION_OFFSET_PX = 7;

export function dotCollisionOffsets(
  dots: DotPosition[],
): Record<Stance, number> {
  const sorted = [...dots].sort((a, b) => a.x - b.x);
  const groups: DotPosition[][] = [];
  let current: DotPosition[] = [];
  for (const d of sorted) {
    if (current.length === 0) {
      current.push(d);
    } else if (d.x - current[current.length - 1].x <= COLLISION_THRESHOLD_PX) {
      current.push(d);
    } else {
      groups.push(current);
      current = [d];
    }
  }
  if (current.length) groups.push(current);

  const offsets: Record<Stance, number> = {
    optimistic: 0,
    pragmatic: 0,
    sceptical: 0,
  };
  for (const group of groups) {
    if (group.length === 1) {
      offsets[group[0].stance] = 0;
    } else if (group.length === 2) {
      offsets[group[0].stance] = -COLLISION_OFFSET_PX;
      offsets[group[1].stance] = COLLISION_OFFSET_PX;
    } else {
      offsets[group[0].stance] = -COLLISION_OFFSET_PX * 2;
      offsets[group[1].stance] = 0;
      offsets[group[2].stance] = COLLISION_OFFSET_PX * 2;
    }
  }
  return offsets;
}
