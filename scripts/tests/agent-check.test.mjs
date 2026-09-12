import test from 'node:test';
import assert from 'node:assert/strict';
import { questions, examples, assessTask, formatAssessment } from '../../src/lib/agent-check.mjs';
const candidate = { judgement: 'ai', path: 'open', tools: 'read', evaluation: 'tests', impact: 'low', frequency: 'repeat' };

test('missing or unrecognised answers do not produce a verdict', () => {
  assert.equal(assessTask({}), null);
  assert.equal(assessTask({ ...candidate, impact: 'unknown' }), null);
});
test('known routes and rules do not require an autonomous agent', () => {
  assert.equal(assessTask({ ...candidate, judgement: 'rules' }).kind, 'script');
  assert.equal(assessTask({ ...candidate, path: 'branching' }).kind, 'workflow');
  assert.equal(assessTask({ ...candidate, tools: 'none' }).kind, 'assistant');
});
test('consequences, undefined success and one-off work limit autonomy', () => {
  assert.equal(assessTask({ ...candidate, evaluation: 'unclear' }).kind, 'define');
  assert.equal(assessTask({ ...candidate, impact: 'high' }).kind, 'supervised');
  assert.equal(assessTask({ ...candidate, frequency: 'once' }).kind, 'manual');
});
test('agent recommendations have explicit limits and write actions have undo controls', () => {
  const result = assessTask({ ...candidate, tools: 'write' });
  assert.equal(result.kind, 'agent');
  assert.ok(result.controls.some((text) => text.includes('undo')));
  assert.ok(result.controls.some((text) => text.includes('Cap retries')));
});
test('all answer combinations produce a result without recommending unchecked or consequential autonomy', () => {
  let combinations = [{}];
  for (const question of questions) combinations = combinations.flatMap((answers) => question.options.map((option) => ({ ...answers, [question.id]: option.value })));
  assert.equal(combinations.length, 324);
  for (const answers of combinations) {
    const result = assessTask(answers);
    assert.ok(result);
    if (result.kind === 'agent') {
      assert.notEqual(answers.impact, 'high');
      assert.notEqual(answers.evaluation, 'unclear');
      assert.notEqual(answers.tools, 'none');
      assert.equal(answers.path, 'open');
    }
  }
});
test('examples and copied assessments include the basis for the recommendation', () => {
  assert.deepEqual(examples.map((example) => assessTask(example.answers).kind), ['workflow', 'agent', 'supervised']);
  const result = assessTask(candidate);
  const report = formatAssessment(candidate, result);
  assert.ok(report.includes(result.title));
  for (const question of questions) assert.ok(report.includes(question.title));
  assert.ok(report.includes('not a benchmark'));
});
