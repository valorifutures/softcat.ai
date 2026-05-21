import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const pipelineMeta = {
  generated_by: z.string().optional(),
  model: z.string().optional(),
  generation_time_s: z.number().optional(),
  cost_usd: z.number().optional(),
};

const newsAndUpdates = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news-and-updates' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
    ...pipelineMeta,
  }),
});

const thoughts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/thoughts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
    pinned: z.boolean().default(false),
    ...pipelineMeta,
  }),
});

const tools = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tools' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().optional(),
    labUrl: z.string().optional(),
    status: z.enum(['active', 'experimental', 'archived']).default('experimental'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const prompts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/prompts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    category: z.string(),
    prompt: z.string(),
    draft: z.boolean().default(false),
    ...pipelineMeta,
  }),
});

const glossary = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/glossary' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).default([]),
    date: z.coerce.date(),
    related: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    ...pipelineMeta,
  }),
});

// ============================================================================
// HORIZON MAP
// See DESIGN doc + ENG REVIEW REPORT 2026-04-09 for the full schema rationale.
// All horizon data flows through Astro Content Collections + Zod (Issue 3).
// Build fails on schema violations automatically; cross-reference integrity
// (dangling related[], evidence.ref, etc.) is enforced by the build-time
// validator at scripts/validate-horizon-refs.mjs — run manually or via CI.
// ============================================================================

const HORIZON_THEMES = [
  'models', 'agents', 'robotics', 'interfaces', 'search',
  'code', 'data', 'infrastructure', 'chips', 'regulation',
  'security', 'enterprise', 'work', 'education', 'creativity', 'society',
] as const;

const horizonTheme = z.enum(HORIZON_THEMES);
const horizonConfidence = z.enum(['confirmed', 'emerging', 'contested', 'speculative']);
const horizonSignalType = z.enum(['event', 'trend', 'forecast', 'debate', 'inflection', 'warning']);

// Strict YYYY-MM-DD with calendar validation. Catches typos like 2025-02-30,
// 2025-13-01, 2025-00-00 that a pure regex would let through. The other site
// collections use z.coerce.date() but horizon stores dates as strings so they
// remain JSON-stable; we validate the calendar via a refine.
const isoDate = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Must be YYYY-MM-DD')
  .refine((s) => {
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }, 'Must be a valid calendar date');

// Lane-prefix id patterns (Outside #4 → Issue 7).
// past-{YYYY}-{slug}     e.g. past-2022-chatgpt-launch
// now-{YYYY-MM}-{slug}   e.g. now-2026-04-glm-5-1
// next-{slug}            e.g. next-agents-enterprise-mainstream
// Slug must start with a letter (avoids past-2016-2017 year/slug ambiguity).
// NOW month is constrained to 01-12. NEXT excludes lane-prefix collisions
// like next-past-foo via negative lookahead.
// Global uniqueness across all lanes is enforced by the build-time validator
// at scripts/validate-horizon-refs.mjs.
const PAST_ID = /^past-\d{4}-[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const NOW_ID = /^now-\d{4}-(0[1-9]|1[0-2])-[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const NEXT_ID = /^next-(?!past-|now-|next-)[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const DEBATE_ID = /^debate-[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const SCENARIO_ID = /^scenario-[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

// Reusable themes array constraint: at least one theme, no duplicates.
const horizonThemeArray = z
  .array(horizonTheme)
  .min(1)
  .refine((arr) => new Set(arr).size === arr.length, 'themes must be unique');

// TODOS #11: evidence and origin share one ref-type vocabulary. radar|news|
// thought refs resolve to a content file (enforced by validate-horizon-refs.mjs);
// paper is a freeform identifier (DOI / arXiv id / title); external must be an
// http(s) URL. The URL rule is the real footgun-catcher — the validator passes
// paper/external through, so without it a date or slug typed into an external
// ref would silently ship a broken outbound link.
const horizonRefType = z.enum(['radar', 'news', 'thought', 'paper', 'external']);
const externalRefIsUrl = (v: { type: string; ref: string }) =>
  v.type !== 'external' || /^https?:\/\/\S+$/.test(v.ref);

const horizonEvidence = z
  .object({
    type: horizonRefType,
    ref: z.string().min(1),
    label: z.string().min(1),
  })
  .strict()
  .refine(externalRefIsUrl, {
    message: "evidence ref with type 'external' must be an http(s) URL",
    path: ['ref'],
  });

// TODOS #11(b): origin shares evidence's full type vocabulary, so a Past entry
// can record promotion from a paper or external source, not just site content.
const horizonOrigin = z
  .object({
    type: horizonRefType,
    ref: z.string().min(1),
    promoted_at: isoDate,
    promoted_reason: z.string().min(1).optional(),
  })
  .strict()
  .refine(externalRefIsUrl, {
    message: "origin ref with type 'external' must be an http(s) URL",
    path: ['ref'],
  });

// Shared lane-entry fields. Each lane extends this with its own id pattern,
// lane discriminator, and date/freshness requirements.
const horizonLaneBase = z.object({
  title: z.string().min(1),
  themes: horizonThemeArray,
  signal_type: horizonSignalType,
  confidence: horizonConfidence,
  why_it_matters: z.string().min(1),
  consequences: z.array(z.string().min(1)).optional(),
  implication: z.string().min(1).optional(),
  evidence: z.array(horizonEvidence).optional(),
  origin: horizonOrigin.optional(),
  related: z.array(z.string()).optional(),
  added: isoDate,
  updated: isoDate.optional(),
});

// TODOS #12: shared relational refine. Applied to each lane's *final* schema
// rather than to horizonLaneBase, because .extend() works on a ZodObject but
// not on the ZodEffects that .refine() produces. Catches a backdated `updated`
// (an entry can't be revised before it was added).
const withLaneRefines = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine(
    (d: { added: string; updated?: string }) => !d.updated || d.updated >= d.added,
    { message: 'updated must be on or after added', path: ['updated'] },
  );

const horizonPast = defineCollection({
  loader: file('src/data/horizon/past.json'),
  schema: withLaneRefines(
    horizonLaneBase
      .extend({
        id: z.string().regex(PAST_ID, 'Past id must be past-{YYYY}-{slug}'),
        lane: z.literal('past'),
        date: isoDate, // required for past
      })
      .strict(),
  ),
});

// Shared schema for now.json (rolling 90d window) and now-archive.json
// (cold archive of entries older than 90d). Same shape, different files
// (Issue 2 reversed by Outside #2).
const horizonNowSchema = withLaneRefines(
  horizonLaneBase
    .extend({
      id: z.string().regex(NOW_ID, 'Now id must be now-{YYYY-MM}-{slug}'),
      lane: z.literal('now'),
      date: isoDate, // required for now
    })
    .strict(),
);

const horizonNow = defineCollection({
  loader: file('src/data/horizon/now.json'),
  schema: horizonNowSchema,
});

const horizonNowArchive = defineCollection({
  loader: file('src/data/horizon/now-archive.json'),
  schema: horizonNowSchema,
});

const horizonNext = defineCollection({
  loader: file('src/data/horizon/next.json'),
  // withLaneRefines adds updated>=added; the chained refine adds the Next-only
  // rule that confidence can't have been reviewed before the entry existed
  // (TODOS #12).
  schema: withLaneRefines(
    horizonLaneBase
      .extend({
        id: z.string().regex(NEXT_ID, 'Next id must be next-{slug}'),
        lane: z.literal('next'),
        date: isoDate.optional(), // optional for next
        // Issue 8 / Outside #6: confidence freshness mandatory on Next.
        // Validator WARNS at >90 days, no fail in v1. TODOS.md #1 tracks the
        // future escalation to hard fail at 180 days.
        confidence_last_reviewed: isoDate,
      })
      .strict(),
  ).refine(
    (d: { added: string; confidence_last_reviewed?: string }) =>
      !d.confidence_last_reviewed || d.confidence_last_reviewed >= d.added,
    {
      message: 'confidence_last_reviewed must be on or after added',
      path: ['confidence_last_reviewed'],
    },
  ),
});

const horizonDebates = defineCollection({
  loader: file('src/data/horizon/debates.json'),
  schema: z
    .object({
      id: z.string().regex(DEBATE_ID, 'Debate id must be debate-{slug}'),
      question: z.string().min(1),
      // TODOS #12: each side needs at least one supporting ref — a debate side
      // arguing from no evidence is a content gap, not a valid entry.
      for: z
        .object({
          argument: z.string().min(1),
          supporting: z.array(z.string()).min(1),
        })
        .strict(),
      against: z
        .object({
          argument: z.string().min(1),
          supporting: z.array(z.string()).min(1),
        })
        .strict(),
      themes: horizonThemeArray,
    })
    .strict(),
});

// Banded axis for the /horizon/five Five Horizons strip (2026-04-22).
// year is required unless band === 'indefinite' (see superRefine below).
// yearToBand auto-derivation lives in src/lib/horizon-axis.ts — the schema
// accepts whatever value is written, so manual overrides are honoured.
const horizonBand = z.enum(['near', 'mid', 'far', 'indefinite']);

const horizonScenarioBranch = z
  .object({
    timeframe: z.string().min(1),
    year: z.number().int().min(2026).max(2060).optional(),
    band: horizonBand.optional(),
    assumptions: z.string().min(1),
    blockers: z.string().min(1),
    implication: z.string().min(1),
  })
  .strict()
  .refine(
    (v) => v.band === 'indefinite' || typeof v.year === 'number',
    { message: 'stance must have year (unless band="indefinite")' },
  );

const horizonScenarios = defineCollection({
  loader: file('src/data/horizon/scenarios.json'),
  schema: z
    .object({
      id: z.string().regex(SCENARIO_ID, 'Scenario id must be scenario-{slug}'),
      topic: z.string().min(1),
      // Outside #7: scenarios need theme + related binding.
      themes: horizonThemeArray,
      related: z.array(z.string()).optional(),
      // Five Horizons additions (2026-04-22): crisp definition rendered at top
      // of Compare View cards AND in the /horizon/five chart tooltip.
      definition: z.string().min(1).max(200),
      contested: z.boolean().optional(),
      debate_ref: z.string().regex(DEBATE_ID).optional(),
      optimistic: horizonScenarioBranch,
      pragmatic: horizonScenarioBranch,
      sceptical: horizonScenarioBranch,
    })
    .strict(),
});

export const collections = {
  'news-and-updates': newsAndUpdates,
  'thoughts': thoughts,
  tools,
  prompts,
  glossary,
  horizonPast,
  horizonNow,
  horizonNowArchive,
  horizonNext,
  horizonDebates,
  horizonScenarios,
};
