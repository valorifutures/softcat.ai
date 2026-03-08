import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import radarManifest from '../data/radar/index.json';

export const GET: APIRoute = async () => {
  const [news, thoughts, tools, prompts] = await Promise.all([
    getCollection('news-and-updates'),
    getCollection('thoughts'),
    getCollection('tools'),
    getCollection('prompts'),
  ]);

  const entries: Array<{
    title: string;
    summary: string;
    url: string;
    type: string;
    tags?: string[];
    date?: string;
  }> = [];

  for (const e of news.filter((n) => !n.data.draft)) {
    entries.push({
      title: e.data.title,
      summary: e.data.summary,
      url: `/news-and-updates/${e.id}`,
      type: 'news',
      tags: e.data.tags,
      date: e.data.date.toISOString().slice(0, 10),
    });
  }

  for (const e of thoughts.filter((t) => !t.data.draft)) {
    entries.push({
      title: e.data.title,
      summary: e.data.summary,
      url: `/thoughts/${e.id}`,
      type: 'thought',
      tags: e.data.tags,
      date: e.data.date.toISOString().slice(0, 10),
    });
  }

  for (const e of tools.filter((t) => !t.data.draft)) {
    entries.push({
      title: e.data.title,
      summary: e.data.description,
      url: `/tools/${e.id}`,
      type: 'tool',
      tags: e.data.tags,
    });
  }

  for (const e of prompts.filter((p) => !p.data.draft)) {
    entries.push({
      title: e.data.title,
      summary: e.data.description,
      url: `/prompts/${e.id}`,
      type: 'prompt',
      tags: e.data.tags,
    });
  }

  // Load radar data
  const radarFiles = import.meta.glob('../data/radar/????-??-??.json', { eager: true });
  for (const [path, mod] of Object.entries(radarFiles)) {
    const data = (mod as any).default;
    const items = [...(data.featured || []), ...(data.picks || [])];
    for (const item of items) {
      entries.push({
        title: item.name,
        summary: item.tagline || item.why_radar || '',
        url: `/radar/${data.date}`,
        type: 'radar',
        tags: item.category ? [item.category] : [],
        date: data.date,
      });
    }
  }

  // Static pages
  const pages = [
    { title: 'Lab', summary: 'Interactive AI tools and experiments', url: '/lab', type: 'page' },
    { title: 'The Radar', summary: 'Daily AI product launches worth knowing about', url: '/radar', type: 'page' },
    { title: 'Agent Builder', summary: 'Build a custom AI agent live', url: '/spawn', type: 'page' },
    { title: 'Request an Agent', summary: 'Request a custom AI agent build', url: '/request', type: 'page' },
  ];
  entries.push(...pages);

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
