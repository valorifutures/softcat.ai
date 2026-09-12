export const questions = [
  { id: 'judgement', title: 'Does the task need AI judgement?', hint: 'Think about the work itself, before choosing a model.', options: [
    { value: 'rules', label: 'Rules are enough', detail: 'Calculations, lookups or predictable transformations.' },
    { value: 'ai', label: 'It needs interpretation', detail: 'Messy language, ambiguous inputs or open questions.' },
  ] },
  { id: 'path', title: 'Can you write the steps ahead of time?', hint: 'A workflow can use AI without letting AI choose the whole process.', options: [
    { value: 'fixed', label: 'Yes, a fixed sequence', detail: 'The same steps in the same order.' },
    { value: 'branching', label: 'Mostly, with known branches', detail: 'The conditions and routes are predictable.' },
    { value: 'open', label: 'No, results change the plan', detail: 'The next useful action depends on what it discovers.' },
  ] },
  { id: 'tools', title: 'What would it do outside the conversation?', hint: 'Reading a log and changing a customer account need different controls.', options: [
    { value: 'none', label: 'Return an answer', detail: 'No external tool actions.' },
    { value: 'read', label: 'Read or search', detail: 'Retrieve information without changing it.' },
    { value: 'write', label: 'Make changes', detail: 'Edit files, update records or take other actions.' },
  ] },
  { id: 'evaluation', title: 'How will you know it worked?', hint: 'A convincing explanation is not a check of the result.', options: [
    { value: 'tests', label: 'A concrete check', detail: 'Tests, reconciled totals or an observable outcome.' },
    { value: 'review', label: 'Someone can review it', detail: 'A person can judge the output before it matters.' },
    { value: 'unclear', label: 'We have not defined that', detail: 'Success still means “looks about right”.' },
  ] },
  { id: 'impact', title: 'What happens when it gets something wrong?', hint: 'Consider the worst plausible mistake in this task.', options: [
    { value: 'low', label: 'A small inconvenience', detail: 'Cheap to spot, discard and retry.' },
    { value: 'reversible', label: 'Work to undo it', detail: 'Changes are logged and can be reversed.' },
    { value: 'high', label: 'A consequential mistake', detail: 'Money, access, people or hard-to-reverse changes.' },
  ] },
  { id: 'frequency', title: 'Is this a repeated job?', hint: 'Automation has a maintenance cost as well as a running cost.', options: [
    { value: 'once', label: 'A one-off or early experiment', detail: 'We are still learning the task.' },
    { value: 'repeat', label: 'It happens regularly', detail: 'There are enough examples to compare approaches.' },
  ] },
];

export const examples = [
  { name: 'Daily research digest', answers: { judgement: 'ai', path: 'fixed', tools: 'read', evaluation: 'review', impact: 'low', frequency: 'repeat' } },
  { name: 'Investigate a failed build', answers: { judgement: 'ai', path: 'open', tools: 'read', evaluation: 'tests', impact: 'reversible', frequency: 'repeat' } },
  { name: 'Issue customer refunds', answers: { judgement: 'ai', path: 'branching', tools: 'write', evaluation: 'review', impact: 'high', frequency: 'repeat' } },
];

export function assessTask(answers) {
  if (!questions.every((q) => q.options.some((option) => option.value === answers[q.id]))) return null;
  const controls = ['Keep a small set of real examples, including failures.', 'Compare quality, time and cost with the current way of doing the task.'];
  if (answers.tools === 'write') controls.push('Use a sandbox first. Log every change and define how to undo it.');
  if (answers.impact === 'high') controls.push('Keep consequential actions behind explicit human approval.');
  let result;
  if (answers.evaluation === 'unclear') {
    result = { kind: 'define', title: 'Define the finish line first', reason: 'You have not defined how to recognise a correct result. More autonomy would make an unclear task harder to evaluate.', next: 'Write three examples of an acceptable result and three failures. Decide who or what can tell them apart.' };
  } else if (answers.frequency === 'once') {
    result = { kind: 'manual', title: 'Do one supervised pass', reason: 'This is still a one-off or an early experiment. Working through it once will teach you more than maintaining an automation now.', next: 'Use a person, with an AI assistant if useful. Record the steps, effort and corrections before deciding what to automate.' };
  } else if (answers.judgement === 'rules') {
    result = { kind: 'script', title: 'Start with a script', reason: 'You said the task can be expressed as rules. A deterministic implementation is easier to check and does not need a model to choose its actions.', next: 'Write the smallest rule-based version. Add test cases for messy inputs before introducing AI.' };
  } else if (answers.impact === 'high') {
    result = { kind: 'supervised', title: 'Use a supervised workflow', reason: 'A mistake could have consequential effects. Keep the action boundary explicit, even when an AI model helps interpret inputs or propose a plan.', next: 'Let AI draft or recommend. Validate its proposal and require a person to approve the consequential action.' };
  } else if (answers.path !== 'open') {
    result = { kind: 'workflow', title: 'Build an AI workflow', reason: 'You can describe the process in advance. Put AI inside the steps that need judgement and let code control the sequence and known branches.', next: 'Draw the steps, define their inputs and outputs, and add a check after each model call.' };
  } else if (answers.tools === 'none') {
    result = { kind: 'assistant', title: 'Start with an assistant', reason: 'The route may vary, but the task only needs an answer. There is no external action loop here that clearly benefits from an agent.', next: 'Try a well-scoped prompt and iterative review. Add tools only when a real task needs them.' };
  } else {
    result = { kind: 'agent', title: answers.evaluation === 'review' ? 'Try a supervised agent' : 'Run a bounded agent trial', reason: 'The next step depends on discoveries, external tools are useful, and you have a way to judge the result. That makes a small agent trial worth comparing with a workflow.', next: 'Give it one task, a short tool list, a time and spend limit, and a clear stop condition. Review the trace and the result.' };
    controls.push('Cap retries and tool calls. Stop and hand back when the check fails.');
    if (answers.evaluation === 'review') controls.push('Have a person review the result before it is used.');
  }
  return { ...result, controls };
}

export function formatAssessment(answers, result) {
  if (!result) return '';
  return ['Should this be an agent?', '', result.title, '', result.reason, '', ...questions.map((q) => `${q.title} ${q.options.find((o) => o.value === answers[q.id])?.label}`), '', 'First experiment', result.next, '', 'Checks to keep', ...result.controls.map((control) => `- ${control}`), '', 'A rule-based design aid, not a benchmark or a guarantee.', 'https://softcat.ai/lab/agent-check'].join('\n');
}
