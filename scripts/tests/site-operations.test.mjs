import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.resolve('astro/package.json'));
const yaml = require('js-yaml');
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

test('cloud councils keep the legacy Feral workflow manual-only', () => {
  const workflow = yaml.load(read('.github/workflows/feral.yml'));
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.equal(workflow.on.workflow_dispatch.inputs.mode.default, 'propose');
});

test('the GitHub price snapshot retains its daily schedule and bounded writer', () => {
  const workflow = yaml.load(read('.github/workflows/model-prices.yml'));
  assert.deepEqual(workflow.on.schedule, [{ cron: '30 5 * * *' }]);
  assert.equal(workflow.concurrency.group, 'model-price-snapshot');
  assert.equal(workflow.permissions.contents, 'read');
  assert.equal(workflow.jobs.refresh.permissions?.contents ?? workflow.permissions.contents, 'read');
  assert.equal(workflow.jobs.publish.needs, 'refresh');
});

test('the publishing guide retains its original date and points to operating evidence', () => {
  const guide = read('src/content/tools/softcat-site.md');
  const metadata = yaml.load(/^---\n([\s\S]*?)\n---/.exec(guide)[1]);
  assert.equal(metadata.date.toISOString().slice(0, 10), '2026-02-23');
  assert.ok(metadata.review.evidence.some(url => url.endsWith('/docs/site-operations.md')));
  assert.match(guide, /Earlier correction, preserved/);
  assert.match(guide, /configured schedule does not prove/);
  assert.match(guide, /six legacy Python content timers stay inactive/);
});
