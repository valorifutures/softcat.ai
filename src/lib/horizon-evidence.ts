// Horizon evidence -> outbound link resolver.
//
// Every Now-lane card carries a structured `evidence[]` array
// ({ type, ref, label }) but the page historically rendered only the COUNT
// ("3 sources") and threw the refs away. This turns each evidence item into a
// real link where a built page exists, and degrades to plain text otherwise so
// we never ship a 404.
//
// Resolution rules, per ref type (mirrors scripts/validate-horizon-refs.mjs):
//   radar    -> /radar/<date>, but ONLY if that date is inside the built
//               window (radar/[date].astro builds the newest RADAR_VISIBLE_DAYS
//               dates; older archive dates have no page).
//   thought  -> /thoughts/<slug>
//   news     -> /news-and-updates/<slug>
//   paper    -> arXiv / DOI / URL if the ref looks like one, else plain text.
//   external -> the ref itself (schema guarantees it is an http(s) URL).
//
// Fallback for thought/news: horizon_bot has historically emitted bare-date
// refs ("2026-06-10") or untruncated slugs that do not match the truncated
// content filename. When an exact slug match fails we take the leading date and
// link it IF exactly one content file shares that date (ambiguous -> plain
// text). This recovers most of those without ever guessing wrong.

export type EvidenceType = 'radar' | 'news' | 'thought' | 'paper' | 'external';

export interface Evidence {
  type: EvidenceType;
  ref: string;
  label: string;
}

export interface ResolverIndex {
  thoughtSlugs: Set<string>;
  newsSlugs: Set<string>;
  visibleRadarDates: Set<string>;
}

export interface EvidenceLink {
  label: string;
  type: EvidenceType;
  href: string | null; // null => render as plain text, no link
  external: boolean;
}

const LEADING_DATE = /^(\d{4}-\d{2}-\d{2})/;
const URL_RE = /^https?:\/\/\S+$/;
const ARXIV_RE = /^\d{4}\.\d{4,5}(v\d+)?$/;
const DOI_RE = /^10\.\d{4,9}\/\S+$/;

// Exact slug, else the unique content file sharing the ref's leading date.
function resolveContentSlug(ref: string, slugs: Set<string>): string | null {
  if (slugs.has(ref)) return ref;
  const m = ref.match(LEADING_DATE);
  if (!m) return null;
  const date = m[1];
  const matches = [...slugs].filter((s) => s.startsWith(date));
  return matches.length === 1 ? matches[0] : null;
}

function paperUrl(ref: string): string | null {
  if (URL_RE.test(ref)) return ref;
  if (ARXIV_RE.test(ref)) return `https://arxiv.org/abs/${ref}`;
  if (DOI_RE.test(ref)) return `https://doi.org/${ref}`;
  return null;
}

export function resolveEvidence(ev: Evidence, idx: ResolverIndex): EvidenceLink {
  const base = { label: ev.label, type: ev.type };
  switch (ev.type) {
    case 'external':
      return { ...base, href: URL_RE.test(ev.ref) ? ev.ref : null, external: true };
    case 'radar':
      return {
        ...base,
        href: idx.visibleRadarDates.has(ev.ref) ? `/radar/${ev.ref}` : null,
        external: false,
      };
    case 'thought': {
      const slug = resolveContentSlug(ev.ref, idx.thoughtSlugs);
      return { ...base, href: slug ? `/thoughts/${slug}` : null, external: false };
    }
    case 'news': {
      const slug = resolveContentSlug(ev.ref, idx.newsSlugs);
      return { ...base, href: slug ? `/news-and-updates/${slug}` : null, external: false };
    }
    case 'paper': {
      const url = paperUrl(ev.ref);
      return { ...base, href: url, external: url != null };
    }
    default:
      return { ...base, href: null, external: false };
  }
}
