import { FUTURES } from './horizon-explorer.mjs';

const site = 'https://softcat.ai';
const date = value => new Date(value).toISOString().slice(0, 10);
const published = entries => entries.filter(entry => !entry.data.draft);
const byDate = (a, b) => new Date(b.data.date) - new Date(a.data.date) || a.id.localeCompare(b.id);
const byTitle = (a, b) => a.data.title.localeCompare(b.data.title) || a.id.localeCompare(b.id);

function article(entry, collection) {
  const data = entry.data;
  const lines = [`### ${data.title}`, `URL: ${site}/${collection}/${entry.id}`];
  if (data.date) lines.push(`Original publication date: ${date(data.date)}`);
  if (data.correction) lines.push(`CORRECTION (${date(data.correction.date)}): ${data.correction.summary}`);
  if (data.review) {
    lines.push(`REVIEW (${data.review.reviewedAt}): ${data.review.summary}`);
    lines.push(`Earlier text: https://github.com/valorifutures/softcat.ai/blob/${data.review.previousRevision}/src/content/${collection}/${entry.id}.md`);
    lines.push('Review evidence:', ...data.review.evidence.map(url => `- ${url}`));
  }
  if (data.generated_by) lines.push(`Recorded generator: ${data.generated_by}`);
  if (data.model) lines.push(`Recorded generation model: ${data.model}`);
  if (data.cost_usd != null) lines.push(`Recorded generation cost (USD, historical): ${data.cost_usd}`);
  if (data.tags?.length) lines.push(`Tags: ${data.tags.join(', ')}`);
  if (data.summary || data.description) lines.push(`Summary: ${data.summary || data.description}`);
  if (data.labUrl) lines.push(`Open tool: ${site}${data.labUrl}`);
  return lines;
}

function recipe(entry) {
  const lines = article(entry, 'prompts');
  const { prompt, category, recipe: review } = entry.data;
  lines.push(`Category: ${category}`, '\nReusable prompt:\n', prompt.trim());
  if (review) {
    lines.push(`\nRecipe reviewed: ${review.reviewedAt}`, `Use when: ${review.when}`);
    lines.push('Inputs:', ...Object.entries(review.inputs).map(([key, description]) => `- ${key}: ${description}`));
    lines.push('\nExample inputs (illustrative):');
    for (const [key, value] of Object.entries(review.exampleValues)) lines.push(`\n${key}:\n${value.trim()}`);
    lines.push('\nExpected result (a target to inspect, not a recorded model response):\n', review.expected.trim());
    lines.push('\nChecks:', ...review.checks.map(check => `- ${check}`));
    lines.push(`\nLimits: ${review.limits}`);
    if (review.tool) lines.push(`Companion tool: ${site}${review.tool}`);
    lines.push(`Earlier template: https://github.com/valorifutures/softcat.ai/blob/${review.previousRevision}/src/content/prompts/${entry.id}.md`);
  }
  if (entry.body?.trim()) lines.push('\nNotes:\n', entry.body.trim());
  return lines;
}

// Use the same published collection records as the HTML pages. The export must
// carry their corrections and example limitations, not just the original body.
export function readingExport({ news = [], thoughts = [], tools = [], prompts = [], glossary = [], predictions = [] } = {}) {
  const sections = [
    '# SOFT CAT .ai - Published reading export',
    'Scope: current Horizon predictions with their target dates, resolution tests and evidence limits, plus the published news archive, notebook and thoughts, local tool guides, prompt recipes and glossary. Interactive tools, alternative Horizon scenarios and Feral artefacts are linked from https://softcat.ai/llms.txt and are not reproduced here.',
    'Dates belong to individual records. Exporting an article does not recheck its claims. Correction and review notices qualify the text that follows. Retired material and unpublished drafts are excluded.',
    'Removal records: https://softcat.ai/thoughts/review | https://softcat.ai/prompts/review | https://softcat.ai/tools/review',
  ];
  if (predictions.length) {
    sections.push('\n## Horizon: our predictions, five countdowns\n', 'These are our editorial judgements, not guarantees or dates supplied by the cited sources. Each target date is a deadline for the defined milestone. The initial forecasts use year-end targets. Their day counts decrease with time and are recalculated when an evidence review changes a target. An elapsed countdown does not establish that the milestone was achieved.\n');
    for (const record of predictions) {
      const future = FUTURES.find(future => future.id === record.id);
      sections.push(
        `### ${record.title}`,
        `URL: ${site}/horizon/?future=${future.key}`,
        `Our prediction: ${record.milestone}`,
        `Prediction deadline: ${record.target_date} (inclusive, UTC)`,
        `Reviewed: ${record.reviewed_at}`,
        '\nWhat would count:', ...record.resolution.map(rule => `- ${rule}`),
        `\nWhy we predict this: ${record.rationale}`,
        `Uncertainty: ${record.uncertainty}`,
        `What would move it earlier: ${record.earlier}`,
        `What would move it later: ${record.later}`,
        '\nEvidence and its limits:',
      );
      for (const source of record.evidence) sections.push(`- ${source.title} (${source.date_label})`, `  ${source.url}`, `  Finding: ${source.finding}`, `  Limit: ${source.limit}`);
      sections.push('\n---\n');
    }
  }
  const groups = [
    ['News archive', news, 'news-and-updates', byDate],
    ['Notebook and thoughts', thoughts, 'thoughts', byDate],
    ['Local tool guides', tools, 'tools', byTitle],
    ['Prompt recipes', prompts, 'prompts', byTitle],
    ['Glossary', glossary, 'glossary', byTitle],
  ];
  for (const [title, entries, collection, order] of groups) {
    const records = published(entries).sort(order);
    if (!records.length) continue;
    sections.push(`\n## ${title}\n`);
    if (collection === 'news-and-updates') sections.push('Historical reports, retained with their original dates. These are not a current news feed or newly verified claims.\n');
    for (const entry of records) {
      const lines = collection === 'prompts' ? recipe(entry) : article(entry, collection);
      if (collection !== 'prompts' && entry.body?.trim()) lines.push('\n', entry.body.trim());
      sections.push(...lines, '\n---\n');
    }
  }
  return sections.join('\n') + '\n';
}
