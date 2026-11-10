import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { readingExport } from '../lib/reading-export.mjs';
import predictionHistory from '../data/horizon/prediction-history.json';
import { latestPredictions } from '../lib/horizon-predictions.mjs';

export const GET: APIRoute = async () => {
  const [news, thoughts, tools, prompts, glossary] = await Promise.all([
    getCollection('news-and-updates'),
    getCollection('thoughts'),
    getCollection('tools'),
    getCollection('prompts'),
    getCollection('glossary'),
  ]);
  return new Response(readingExport({ news, thoughts, tools, prompts, glossary, predictions: latestPredictions(predictionHistory) }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
