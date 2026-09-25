import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyTrialDraft, trialBrief, TRIAL_FIELD_LIMIT, updateTrialDraft } from '../../src/lib/horizon-trial.mjs';
import { latestPredictions } from '../../src/lib/horizon-predictions.mjs';

const history = JSON.parse(readFileSync(new URL('../../src/data/horizon/prediction-history.json', import.meta.url), 'utf8'));
const briefs = JSON.parse(readFileSync(new URL('../../src/data/horizon/decision-briefs.json', import.meta.url), 'utf8'));
const records = latestPredictions(history);

test('editing one future retains independent drafts without changing earlier state', () => {
  const [first, second] = records;
  const original = {};
  const one = updateTrialDraft(original, first.id, 'task', 'A bounded task');
  const two = updateTrialDraft(one, second.id, 'task', 'A different trial');
  const three = updateTrialDraft(two, first.id, 'owner', 'The case owner');
  assert.deepEqual(original, {});
  assert.equal(one[first.id].owner, '');
  assert.equal(three[first.id].task, 'A bounded task');
  assert.equal(three[first.id].owner, 'The case owner');
  assert.equal(three[second.id].task, 'A different trial');
  assert.equal(three[second.id].owner, '');
  assert.deepEqual(emptyTrialDraft(), { task: '', owner: '', baseline: '', success: '', stop: '' });
});

test('only known fields and futures can receive a bounded draft', () => {
  const id = records[0].id;
  assert.throws(() => updateTrialDraft({}, 'unknown', 'task', 'x'));
  assert.throws(() => updateTrialDraft({}, id, 'target_date', '2027-01-01'));
  assert.throws(() => updateTrialDraft({}, id, 'task', null));
  assert.equal(updateTrialDraft({}, id, 'task', 'x'.repeat(TRIAL_FIELD_LIMIT + 1))[id].task.length, TRIAL_FIELD_LIMIT);
});

test('empty trial exports remain visibly unfinished and cannot look like completed evidence', () => {
  const record = records[0], brief = briefs.find(item => item.id === record.id);
  const text = trialBrief(record, brief, { ...emptyTrialDraft(), baseline: '   ' });
  assert.equal((text.match(/\n\[To decide\]/g) || []).length, 5);
  assert.match(text, /visitor-written plan, not a completed trial or evidence/);
  assert.match(text, /90 days are a planning horizon, separate from our prediction deadline/);
  assert.throws(() => trialBrief(record, briefs.find(item => item.id !== record.id), {}));
});

test('all five exports carry their own current review, criteria and source limits', () => {
  for (const record of records) {
    const brief = briefs.find(item => item.id === record.id);
    const text = trialBrief(record, brief, emptyTrialDraft());
    assert.ok(text.includes(record.title));
    assert.ok(text.includes(`Prediction deadline: ${record.target_date}`));
    assert.ok(text.includes(`Evidence reviewed: ${record.reviewed_at}`));
    assert.ok(text.includes(`Review record: ${record.event_id}`));
    assert.ok(text.includes(brief.moves.pragmatic));
    assert.ok(text.includes(brief.measure));
    assert.ok(text.includes(record.uncertainty));
    for (const criterion of record.resolution) assert.ok(text.includes(criterion));
    for (const source of record.evidence) {
      assert.ok(text.includes(source.url));
      assert.ok(text.includes(source.finding));
      assert.ok(text.includes(source.limit));
    }
  }
});

test('a genuine refreshed record updates export context while keeping the visitor draft', () => {
  const record = records[0], brief = briefs.find(item => item.id === record.id);
  const originalTarget = record.target_date;
  const draft = { ...emptyTrialDraft(), task: 'Keep this plan', baseline: 'Two lines\nwith a comparison' };
  const refreshed = { ...record, target_date: '2033-04-05', reviewed_at: '2030-02-03', event_id: 'fixture-new-review' };
  const text = trialBrief(refreshed, brief, draft);
  assert.ok(text.includes('Keep this plan'));
  assert.ok(text.includes('Two lines\nwith a comparison'));
  assert.ok(text.includes('Prediction deadline: 2033-04-05'));
  assert.ok(text.includes('Evidence reviewed: 2030-02-03'));
  assert.ok(text.includes('Review record: fixture-new-review'));
  assert.equal(draft.task, 'Keep this plan');
  assert.equal(record.target_date, originalTarget);
});

test('the plain-text brief preserves user text without treating it as markup or a forecast edit', () => {
  const record = records[0], brief = briefs.find(item => item.id === record.id);
  const draft = { ...emptyTrialDraft(), task: '<script>alert("fixture")</script>\nKeep this literal.', target_date: '2040-01-01' };
  const text = trialBrief(record, brief, draft);
  assert.ok(text.includes(draft.task));
  assert.ok(text.includes(`Prediction deadline: ${record.target_date}`));
  assert.ok(!text.includes('2040-01-01'));
});
