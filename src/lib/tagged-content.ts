import { getCollection } from 'astro:content';

export interface TaggedEntry {
  title: string;
  summary: string;
  href: string;
  tags: string[];
  kind: string;
  date?: Date;
  status?: string;
  draft: boolean;
}

export async function getTaggedContent(): Promise<TaggedEntry[]> {
  const [news, thoughts, tools, prompts, glossary] = await Promise.all([
    getCollection('news-and-updates'), getCollection('thoughts'), getCollection('tools'),
    getCollection('prompts'), getCollection('glossary'),
  ]);
  const entries: TaggedEntry[] = [
    ...news.map(entry => ({ title: entry.data.title, summary: entry.data.summary, href: `/news-and-updates/${entry.id}`, tags: entry.data.tags, kind: 'News archive', date: entry.data.date, draft: entry.data.draft })),
    ...thoughts.map(entry => ({ title: entry.data.title, summary: entry.data.summary, href: `/thoughts/${entry.id}`, tags: entry.data.tags, kind: entry.data.tags.includes('field-notes') ? 'Notebook' : 'Thoughts', date: entry.data.date, draft: entry.data.draft })),
    ...tools.map(entry => ({ title: entry.data.title, summary: entry.data.description, href: `/tools/${entry.id}`, tags: entry.data.tags, kind: 'Tool write-ups', date: entry.data.date, status: entry.data.status, draft: entry.data.draft })),
    ...prompts.map(entry => ({ title: entry.data.title, summary: entry.data.description, href: `/prompts/${entry.id}`, tags: entry.data.tags, kind: 'Prompts', draft: entry.data.draft })),
    ...glossary.map(entry => ({ title: entry.data.title, summary: entry.data.description, href: `/glossary/${entry.id}`, tags: entry.data.tags, kind: 'Glossary', date: entry.data.date, draft: entry.data.draft })),
  ];
  return entries.filter(entry => !entry.draft);
}
