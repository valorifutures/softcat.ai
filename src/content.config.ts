import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const workshopLog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/workshop-log' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

const tradingDispatches = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/trading-dispatches' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    market: z.string().optional(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

const tools = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tools' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().optional(),
    status: z.enum(['active', 'experimental', 'archived']).default('experimental'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  'workshop-log': workshopLog,
  'trading-dispatches': tradingDispatches,
  tools,
};
