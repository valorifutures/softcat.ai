import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import feral from '../content/feral/manifest.json';
import type { APIContext } from 'astro';

// This feed is a record of actual publication, not an automated news ticker.
// Feral records a calendar date without a time. RSS requires a Date, so we
// encode that date at 00:00 UTC and say that the exact time is not recorded.
export async function GET(context: APIContext) {
  const news = (await getCollection('news-and-updates')).filter((entry) => !entry.data.draft);
  const thoughts = (await getCollection('thoughts')).filter((entry) => !entry.data.draft);
  const items = [
    ...feral.map((creation) => ({
      title: `Feral: ${creation.title}`,
      description: `${creation.blurb} An AI council creation recorded on ${creation.born}. The time of publication was not recorded.`,
      pubDate: new Date(`${creation.born}T00:00:00Z`),
      link: creation.route,
    })),
    ...thoughts.map((entry) => ({
      title: entry.data.title,
      description: entry.data.summary,
      pubDate: entry.data.date,
      link: `/thoughts/${entry.id}/`,
    })),
    ...news.map((entry) => ({
      title: entry.data.title,
      description: `Historical AI news digest, published ${entry.data.date.toISOString().slice(0, 10)}. Not verified as current. ${entry.data.summary}`,
      pubDate: entry.data.date,
      link: `/news-and-updates/${entry.id}/`,
    })),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime() || a.link.localeCompare(b.link));

  return rss({
    title: 'SOFT CAT .ai | Published work',
    description: 'Dated field notes, Feral creations and historical AI news. This feed is not a promise of daily updates.',
    site: context.site!.toString(),
    items,
  });
}
