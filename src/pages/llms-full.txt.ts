import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const [news, thoughts, prompts, glossary] = await Promise.all([
    getCollection('news-and-updates'),
    getCollection('thoughts'),
    getCollection('prompts'),
    getCollection('glossary'),
  ]);

  const sections: string[] = ['# SOFT CAT .ai - Full Content Export\n'];

  const publishedNews = news
    .filter((e) => !e.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  if (publishedNews.length > 0) {
    sections.push('## News & Updates\n');
    for (const entry of publishedNews) {
      sections.push(`### ${entry.data.title}`);
      sections.push(`Date: ${entry.data.date.toISOString().split('T')[0]}`);
      sections.push(`Tags: ${entry.data.tags.join(', ')}`);
      sections.push(`Summary: ${entry.data.summary}\n`);
      if (entry.body) sections.push(entry.body.trim());
      sections.push('\n---\n');
    }
  }

  const publishedThoughts = thoughts
    .filter((e) => !e.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  if (publishedThoughts.length > 0) {
    sections.push('## Thoughts\n');
    for (const entry of publishedThoughts) {
      sections.push(`### ${entry.data.title}`);
      sections.push(`Date: ${entry.data.date.toISOString().split('T')[0]}`);
      sections.push(`Tags: ${entry.data.tags.join(', ')}`);
      sections.push(`Summary: ${entry.data.summary}\n`);
      if (entry.body) sections.push(entry.body.trim());
      sections.push('\n---\n');
    }
  }

  const publishedPrompts = prompts
    .filter((e) => !e.data.draft)
    .sort((a, b) => a.data.title.localeCompare(b.data.title));

  if (publishedPrompts.length > 0) {
    sections.push('## Prompts\n');
    for (const entry of publishedPrompts) {
      sections.push(`### ${entry.data.title}`);
      sections.push(`Category: ${entry.data.category}`);
      sections.push(`Tags: ${entry.data.tags.join(', ')}`);
      sections.push(`Description: ${entry.data.description}\n`);
      sections.push(entry.data.prompt.trim());
      sections.push('\n---\n');
    }
  }

  const publishedGlossary = glossary
    .filter((e) => !e.data.draft)
    .sort((a, b) => a.data.title.localeCompare(b.data.title));

  if (publishedGlossary.length > 0) {
    sections.push('## Glossary\n');
    for (const entry of publishedGlossary) {
      sections.push(`### ${entry.data.title}`);
      sections.push(`Tags: ${entry.data.tags.join(', ')}`);
      sections.push(`Description: ${entry.data.description}\n`);
      if (entry.body) sections.push(entry.body.trim());
      sections.push('\n---\n');
    }
  }

  return new Response(sections.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
