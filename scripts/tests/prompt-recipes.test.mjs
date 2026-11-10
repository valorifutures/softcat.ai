import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { recipeErrors, recipeDraft, recipeExample, promptRetirementErrors } from '../../src/lib/prompt-recipes.mjs';
const require = createRequire(import.meta.resolve('astro/package.json'));
const yaml = require('js-yaml');
const recipe = { title: 'A recipe', prompt: 'Use {{source}}. Answer {{question}}.', draft: false, recipe: { version: 1, reviewedAt: '2026-09-13', previousRevision: 'a'.repeat(40), when: 'For a small task.', inputs: { source: 'The source.', question: 'The question.' }, exampleValues: { source: 'A source', question: 'A question' }, expected: 'A target', checks: ['Check the source.', 'Check the format.'], limits: 'Not a guarantee.', tool: '/lab/json-validator' } };

test('a recipe fills its explicit sample inputs without mutating the source', () => {
  assert.deepEqual(recipeErrors(recipe), []);
  assert.equal(recipeExample(recipe), 'Use A source. Answer A question.');
  const draft = recipeDraft(recipe); draft.vars.source = 'Changed';
  assert.equal(recipe.recipe.exampleValues.source, 'A source');
  assert.equal(draft.system, ''); assert.equal(draft.assistant, '');
});

test('published recipes need real inputs, examples, checks and review metadata', () => {
  assert.deepEqual(recipeErrors({ draft: true }), []);
  assert.ok(recipeErrors({ ...recipe, recipe: null }).length);
  for (const change of [{ reviewedAt: '2999-01-01' }, { previousRevision: 'main' }, { checks: [] }, { inputs: {} }, { exampleValues: { source: 'Only one value' } }, { expected: '' }, { tool: 'https://example.com' }]) assert.ok(recipeErrors({ ...recipe, recipe: { ...recipe.recipe, ...change } }).length, JSON.stringify(change));
  assert.ok(recipeErrors({ ...recipe, recipe: { ...recipe.recipe, exampleValues: { ...recipe.recipe.exampleValues, extra: 'Unused' } } }).length);
});

test('retired templates need exact source history and cannot collide with active routes', () => {
  const entry = { id: 'old-template', title: 'Old template', sourcePath: 'src/content/prompts/old-template.md', sourceRevision: 'a'.repeat(40), sourceBlob: 'b'.repeat(40), firstCommit: 'c'.repeat(40), gitRecordedDate: '2026-02-01', retiredAt: '2026-09-13', origin: 'bot' };
  const review = { version: 1, reviewedAt: '2026-09-13', reason: 'Editorial retirement.', entries: [entry] };
  assert.deepEqual(promptRetirementErrors(review), []);
  assert.ok(promptRetirementErrors(review, new Set(['old-template'])).length);
  assert.ok(promptRetirementErrors({ ...review, entries: [entry, entry] }).length);
  assert.ok(promptRetirementErrors({ ...review, entries: [{ ...entry, sourcePath: 'other.md' }] }).length);
});

test('all published recipe samples fill, and the extraction target parses as JSON', () => {
  const dir = new URL('../../src/content/prompts/', import.meta.url);
  const records = readdirSync(dir).filter(name => name.endsWith('.md')).map(name => ({ name, data: yaml.load(readFileSync(new URL(name, dir), 'utf8').split(/^---\s*$/m)[1]) })).filter(entry => !entry.data.draft);
  for (const entry of records) { assert.deepEqual(recipeErrors(entry.data), [], entry.name); assert.ok(recipeExample(entry.data).length > 0); }
  const extraction = records.find(entry => entry.name === 'data-extraction.md');
  assert.equal(JSON.parse(extraction.data.recipe.expected).values.due_date, null);
});
