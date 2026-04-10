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
// validator at scripts/validate-horizon-refs.ts (Step 4.5, lands separately).
// ============================================================================

const HORIZON_THEMES = [
  'models', 'agents', 'robotics', 'interfaces', 'search',
  'code', 'data', 'infrastructure', 'chips', 'regulation',
  'security', 'enterprise', 'work', 'education', 'creativity', 'society',
] as const;

const horizonTheme = z.enum(HORIZON_THEMES);
const horizonConfidence = z.enum(['confirmed', 'emerging', 'contested', 'speculative']);
const horizonSignalType = z.enum(['event', 'trend', 'forecast', 'debate', 'inflection', 'warning']);

// Accepts YYYY-MM-DD or full ISO 8601 datetime.
const isoDate = z.string().regex(
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/,
  'Must be ISO date (YYYY-MM-DD or full ISO 8601)',
);

// Lane-prefix id patterns (Outside #4 → Issue 7).
// past-{YYYY}-{slug}     e.g. past-2022-chatgpt-launch
// now-{YYYY-MM}-{slug}   e.g. now-2026-04-glm-5-1
// next-{slug}            e.g. next-agents-enterprise-mainstream
// Global uniqueness across all lanes is enforced by the build-time validator.
const PAST_ID = /^past-\d{4}-[a-z0-9]+(-[a-z0-9]+)*$/;
const NOW_ID = /^now-\d{4}-\d{2}-[a-z0-9]+(-[a-z0-9]+)*$/;
const NEXT_ID = /^next-[a-z0-9]+(-[a-z0-9]+)*$/;

const horizonEvidence = z.object({
  type: z.enum(['radar', 'news', 'thought', 'paper', 'external']),
  ref: z.string(),
  label: z.string(),
});

const horizonOrigin = z.object({
  type: z.enum(['radar', 'news', 'thought']),
  ref: z.string(),
  promoted_at: isoDate,
  promoted_reason: z.string().optional(),
});

// Shared lane-entry fields. Each lane extends this with its own id pattern,
// lane discriminator, and date/freshness requirements.
const horizonLaneBase = z.object({
  title: z.string(),
  themes: z.array(horizonTheme).min(1),
  signal_type: horizonSignalType,
  confidence: horizonConfidence,
  why_it_matters: z.string(),
  consequences: z.array(z.string()).optional(),
  implication: z.string().optional(),
  evidence: z.array(horizonEvidence).optional(),
  origin: horizonOrigin.optional(),
  related: z.array(z.string()).optional(),
  added: isoDate,
  updated: isoDate.optional(),
});

const horizonPast = defineCollection({
  loader: file('src/data/horizon/past.json'),
  schema: horizonLaneBase.extend({
    id: z.string().regex(PAST_ID, 'Past id must be past-{YYYY}-{slug}'),
    lane: z.literal('past'),
    date: isoDate, // required for past
  }),
});

// Shared schema for now.json (rolling 90d window) and now-archive.json
// (cold archive of entries older than 90d). Same shape, different files
// (Issue 2 reversed by Outside #2).
const horizonNowSchema = horizonLaneBase.extend({
  id: z.string().regex(NOW_ID, 'Now id must be now-{YYYY-MM}-{slug}'),
  lane: z.literal('now'),
  date: isoDate, // required for now
});

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
  schema: horizonLaneBase.extend({
    id: z.string().regex(NEXT_ID, 'Next id must be next-{slug}'),
    lane: z.literal('next'),
    date: isoDate.optional(), // optional for next
    // Issue 8 / Outside #6: confidence freshness mandatory on Next.
    // Validator (Step 4.5) WARNS at >90 days, no fail in v1. TODOS.md #1
    // tracks the future escalation to hard fail at 180 days.
    confidence_last_reviewed: isoDate,
  }),
});

const horizonDebates = defineCollection({
  loader: file('src/data/horizon/debates.json'),
  schema: z.object({
    id: z.string(),
    question: z.string(),
    for: z.object({
      argument: z.string(),
      supporting: z.array(z.string()),
    }),
    against: z.object({
      argument: z.string(),
      supporting: z.array(z.string()),
    }),
    themes: z.array(horizonTheme).min(1),
  }),
});

const horizonScenarioBranch = z.object({
  timeframe: z.string(),
  assumptions: z.string(),
  blockers: z.string(),
  implication: z.string(),
});

const horizonScenarios = defineCollection({
  loader: file('src/data/horizon/scenarios.json'),
  schema: z.object({
    id: z.string(),
    topic: z.string(),
    // Outside #7: scenarios need theme + related binding.
    themes: z.array(horizonTheme).min(1),
    related: z.array(z.string()).optional(),
    optimistic: horizonScenarioBranch,
    pragmatic: horizonScenarioBranch,
    sceptical: horizonScenarioBranch,
  }),
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
