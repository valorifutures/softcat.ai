import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import radarManifest from '../data/radar/index.json';
import { RADAR_VISIBLE_DAYS } from '../utils/radar';

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

  // Load radar data, bounded to the visible window. Older day-files stay on
  // disk for the horizon bot but have no public /radar/<date> route, so indexing
  // them would point search results at pages that 404. Lazy glob keeps the build
  // from reading the entire archive into memory.
  const radarFiles = import.meta.glob('../data/radar/????-??-??.json');
  const visibleDates = radarManifest.dates.slice(0, RADAR_VISIBLE_DAYS);
  for (const date of visibleDates) {
    const key = Object.keys(radarFiles).find((k) => k.includes(date));
    if (!key) continue;
    const data = (await radarFiles[key]()) as any;
    const items = [...(data.default.featured || []), ...(data.default.picks || [])];
    for (const item of items) {
      entries.push({
        title: item.name,
        summary: item.tagline || item.why_radar || '',
        url: `/radar/${data.default.date}`,
        type: 'radar',
        tags: item.category ? [item.category] : [],
        date: data.default.date,
      });
    }
  }

  // Static pages
  const pages = [
    { title: 'The Radar', summary: 'Daily AI product launches worth knowing about', url: '/radar', type: 'page' },
  ];
  entries.push(...pages);

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
