import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const workshop = (await getCollection('workshop-log')).filter((e) => !e.data.draft);
  const fieldNotes = (await getCollection('field-notes')).filter((e) => !e.data.draft);

  const items = [
    ...workshop.map((e) => ({
      title: e.data.title,
      description: e.data.summary,
      pubDate: e.data.date,
      link: `/workshop-log/${e.id}/`,
    })),
    ...fieldNotes.map((e) => ({
      title: e.data.title,
      description: e.data.summary,
      pubDate: e.data.date,
      link: `/field-notes/${e.id}/`,
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: 'SOFT CAT .ai',
    description: 'Smart Outputs From Trained Conversational AI Technology. An AI workshop by Valori.',
    site: context.site!.toString(),
    items,
  });
}
