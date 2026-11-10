import test from 'node:test';
import assert from 'node:assert/strict';
import { searchEntries, searchScore, validateSearchIndex } from '../../src/lib/site-search.mjs';
const entry = (title, summary = '', tags = []) => ({ title, summary, tags, url: '/example', type: 'page' });

test('exact tool titles outrank incidental mentions and each query word must match', () => {
  const tool = entry('Agent check', 'Six questions about choosing a workflow.');
  const note = entry('A working notebook', 'We added an agent check today.');
  assert.equal(searchEntries([note, tool], 'agent check')[0], tool);
  assert.equal(searchScore('agent banana', tool), 0);
  assert.equal(searchScore('xyz', entry('An experiment', 'x then yellow then zebra')), 0);
});

test('handles punctuation, accents, prefixes and a bounded title typo', () => {
  assert.ok(searchScore('gpt-5', entry('GPT 5')) > 0);
  assert.ok(searchScore('tokens', entry('Token Cost Calculator')) > 0);
  assert.ok(searchScore('agent check', entry('Should this be an agent?', '', ['agent-check'])) > 0);
  assert.ok(searchScore('cafe', entry('Café models')) > 0);
  assert.ok(searchScore('token calc', entry('Token Calculator')) > 0);
  assert.ok(searchScore('horizn', entry('Horizon Map')) > 0);
  assert.equal(searchScore('horzn', entry('Horizon Map')), 0);
  assert.equal(searchScore('h', entry('Horizon Map')), 0);
});

test('malformed or external search-index destinations fail visibly', () => {
  const valid = entry('A page');
  assert.deepEqual(validateSearchIndex([valid]), [valid]);
  assert.deepEqual(validateSearchIndex([]), []);
  for (const url of ['https://elsewhere.example', '//elsewhere.example', '/\\elsewhere.example', 'javascript:alert(1)']) assert.throws(() => validateSearchIndex([{ ...valid, url }]));
  for (const value of [{}, [null], [{ ...valid, tags: [5] }], [{ ...valid, title: '' }]]) assert.throws(() => validateSearchIndex(value));
});


test('a named interactive tool outranks a passing archive mention', () => {
  const tool = { ...entry('Should this be an agent?', 'Six questions.', ['agents', 'agent-check']), url: '/lab/agent-check', type: 'tool' };
  const note = entry('AI digest: Agent protocols and model reality checks');
  assert.equal(searchEntries([note, tool], 'agent check')[0], tool);
  const calculator = { ...entry('Token Cost Calculator', '', ['tokens']), url: '/lab/token-cost', type: 'tool' };
  assert.equal(searchEntries([entry('TokenSpeed'), calculator], 'tokens')[0], calculator);
});
