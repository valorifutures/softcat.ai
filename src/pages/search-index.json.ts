import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import toolsManifest from '../data/tools-manifest.json';
import feralManifest from '../content/feral/manifest.json';
import radarManifest from '../data/radar/index.json';
import { RADAR_VISIBLE_DAYS } from '../utils/radar';

export const GET: APIRoute = async () => {
  const [news, thoughts, tools, prompts, glossary, forecasts, scenarios] = await Promise.all([
    getCollection('news-and-updates'),
    getCollection('thoughts'),
    getCollection('tools'),
    getCollection('prompts'),
    getCollection('glossary'),
    getCollection('horizonNext'),
    getCollection('horizonScenarios'),
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
      type: 'guide',
      date: e.data.date.toISOString().slice(0, 10),
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

  for (const entry of glossary.filter(item => !item.data.draft)) entries.push({ title: entry.data.title, summary: entry.data.description, url: `/glossary/${entry.id}`, type: 'glossary', tags: entry.data.tags });
  for (const entry of forecasts) entries.push({ title: entry.data.title, summary: entry.data.why_it_matters, url: `/horizon#${entry.data.id}`, type: 'forecast', tags: entry.data.themes, date: entry.data.confidence_last_reviewed });
  for (const entry of scenarios) entries.push({ title: `${entry.data.topic}: three scenarios`, summary: entry.data.definition, url: `/horizon#${entry.id}`, type: 'page', tags: entry.data.themes });
  for (const room of feralManifest) entries.push({ title: room.title, summary: room.blurb, url: room.route, type: 'experiment', tags: ['feral', room.type], date: room.born });

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

  for (const tool of toolsManifest) entries.push({ title: tool.name, summary: tool.description, url: tool.href, type: 'tool', tags: [tool.category, tool.id, ...(tool.id === 'token-cost' ? ['tokens', 'tokenizer', 'API cost'] : [])] });

  // Static pages
  const pages = [
    { title: 'Notebook', summary: 'The public build diary: experiments, decisions and failures with evidence.', url: '/notebook', type: 'page' },
    { title: 'Horizon Map', summary: 'A dated map of AI history, signals and possible futures.', url: '/horizon', type: 'page' },
    { title: 'Horizon review record', summary: 'Original claims, withdrawn forecasts, archived signals and the evidence behind our revisions.', url: '/horizon/review', type: 'page' },
    { title: 'Five Horizons', summary: 'Editorial scenarios for AGI, agentic work, robotics, software and education. Hypotheses, not expert consensus.', url: '/horizon/five', type: 'page' },
    { title: 'Glossary', summary: 'Plain explanations of AI terms, models, evaluation and infrastructure.', url: '/glossary', type: 'page' },
    { title: 'Pipeline', summary: 'Dated bot runs, outcomes and recorded costs.', url: '/pipeline', type: 'page' },
    { title: 'Feral', summary: 'Agent-created experiments and their execution records.', url: '/feral', type: 'page' },
    { title: 'The Radar', summary: 'Dated records of AI product launches', url: '/radar', type: 'page' },
  ];
  entries.push(...pages);

  return new Response(JSON.stringify(entries), {
    headers: { 'Content-Type': 'application/json' },
  });
};
