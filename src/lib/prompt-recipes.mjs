import { variableKeys, renderPrompt } from './prompt-workbench.mjs';

export function recipeDraft(recipe) {
  return { name: recipe.title, system: '', user: recipe.prompt, assistant: '', vars: { ...recipe.recipe.exampleValues } };
}

export function recipeExample(recipe) {
  return renderPrompt(recipeDraft(recipe)).user;
}

export function recipeErrors(entry, now = Date.now()) {
  if (entry.draft === true) return [];
  const review = entry.recipe;
  if (!review || review.version !== 1) return ['Published prompts need a reviewed recipe.'];
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(review.reviewedAt) || !Number.isFinite(Date.parse(review.reviewedAt)) || new Date(review.reviewedAt).toISOString().slice(0, 10) !== review.reviewedAt || Date.parse(review.reviewedAt) > now) errors.push('Recipe review date is invalid or in the future.');
  if (!/^[a-f0-9]{40}$/.test(review.previousRevision)) errors.push('The earlier template needs an exact source revision.');
  for (const key of ['when', 'expected', 'limits']) if (typeof review[key] !== 'string' || !review[key].trim()) errors.push(`Recipe ${key} is missing.`);
  if (!Array.isArray(review.checks) || review.checks.length < 2 || review.checks.some(check => typeof check !== 'string' || !check.trim())) errors.push('A recipe needs at least two explicit checks.');
  if (!review.inputs || typeof review.inputs !== 'object' || Array.isArray(review.inputs) || Object.values(review.inputs).some(value => typeof value !== 'string' || !value.trim())) errors.push('Recipe inputs need named descriptions.');
  if (!review.exampleValues || typeof review.exampleValues !== 'object' || Array.isArray(review.exampleValues)) errors.push('Recipe example values are missing.');
  if (typeof entry.prompt !== 'string' || !entry.prompt.trim()) errors.push('The prompt is missing.');
  else {
    const keys = variableKeys(entry.prompt);
    if (!keys.length) errors.push('A recipe needs explicit input variables.');
    for (const key of keys) {
      if (!Object.hasOwn(review.inputs || {}, key)) errors.push(`Missing input description: ${key}.`);
      if (typeof review.exampleValues?.[key] !== 'string' || !review.exampleValues[key].trim()) errors.push(`Missing example input: ${key}.`);
    }
    for (const key of Object.keys(review.exampleValues || {})) if (!keys.includes(key)) errors.push(`Example input ${key} has no prompt variable.`);
    try { recipeExample(entry); } catch (error) { errors.push(error.message); }
  }
  if (review.tool && !/^\/lab\/[a-z0-9-]+$/.test(review.tool)) errors.push('Recipe tool link must be a local lab tool.');
  return errors;
}

export function promptRetirementErrors(review, activeIds = new Set(), now = Date.now()) {
  if (review?.version !== 1 || !Array.isArray(review.entries) || typeof review.reason !== 'string' || !review.reason.trim()) return ['Invalid prompt retirement record.'];
  const errors = [], seen = new Set();
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value && Date.parse(value) <= now;
  if (!validDate(review.reviewedAt)) errors.push('Invalid prompt retirement review date.');
  for (const entry of review.entries) {
    if (!entry || !/^[a-z0-9][a-z0-9-]*$/.test(entry.id)) { errors.push('Invalid retired prompt route.'); continue; }
    if (seen.has(entry.id) || activeIds.has(entry.id)) errors.push(`${entry.id}: retired prompt route is duplicated or active.`);
    seen.add(entry.id);
    if (typeof entry.title !== 'string' || !entry.title.trim()) errors.push(`${entry.id}: original title is missing.`);
    if (entry.sourcePath !== `src/content/prompts/${entry.id}.md` || ![entry.sourceRevision, entry.sourceBlob, entry.firstCommit].every(value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value))) errors.push(`${entry.id}: exact source history is missing.`);
    if (!validDate(entry.gitRecordedDate) || !validDate(entry.retiredAt) || entry.gitRecordedDate > entry.retiredAt) errors.push(`${entry.id}: invalid history dates.`);
    if (!['bot', 'earlier-template'].includes(entry.origin)) errors.push(`${entry.id}: missing origin record.`);
  }
  return errors;
}
