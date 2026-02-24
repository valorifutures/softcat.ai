import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const newsAndUpdates = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news-and-updates' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    summary: z.string(),
    draft: z.boolean().default(false),
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

export const collections = {
  'news-and-updates': newsAndUpdates,
  'thoughts': thoughts,
  tools,
};
