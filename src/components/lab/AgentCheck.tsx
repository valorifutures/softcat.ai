import { useState } from 'preact/hooks';
import { questions, examples, assessTask, formatAssessment } from '../../lib/agent-check.mjs';

export default function AgentCheck() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState('');
  const result = assessTask(answers);
  const completed = questions.filter((q) => answers[q.id]).length;
  const choose = (id: string, value: string) => { setAnswers((previous) => ({ ...previous, [id]: value })); setCopied(''); };

  async function copy() {
    try { await navigator.clipboard.writeText(formatAssessment(answers, result)); setCopied('Copied assessment'); }
    catch { setCopied('Clipboard unavailable. You can select and copy the result below.'); }
  }

  return <div class="agent-check">
    <div class="agent-examples">
      <p>Try a real task shape</p>
      <div>{examples.map((example) => <button onClick={() => { setAnswers({ ...example.answers }); setCopied(''); }}>{example.name} <span aria-hidden="true">↗</span></button>)}</div>
    </div>
    <div class="agent-layout">
      <div class="agent-questions">
        {questions.map((question, index) => <fieldset>
          <legend><span class="question-number">0{index + 1}</span>{question.title}</legend>
          <p class="question-hint">{question.hint}</p>
          <div class="agent-options">{question.options.map((option) => <label class={answers[question.id] === option.value ? 'selected' : ''}>
            <input type="radio" name={question.id} value={option.value} checked={answers[question.id] === option.value} onChange={() => choose(question.id, option.value)} />
            <span><strong>{option.label}</strong><small>{option.detail}</small></span>
          </label>)}</div>
        </fieldset>)}
      </div>
      <aside class="agent-result" aria-label="Your assessment">
        <div class="agent-result-inner">
          <div class="result-status"><span>YOUR TASK, YOUR TRADE-OFFS</span><span>{completed}/{questions.length}</span></div>
          <progress value={completed} max={questions.length} aria-label="Questions answered" />
          <div aria-live="polite" aria-atomic="true">
            {result ? <>
              <p class="result-kind">Suggested starting point</p>
              <h2>{result.title}</h2>
              <p class="result-reason">{result.reason}</p>
              <h3>First experiment</h3><p>{result.next}</p>
              <h3>Checks to keep</h3>
              <ul>{result.controls.map((control) => <li>{control}</li>)}</ul>
            </> : <>
              <h2>Start with the task.</h2>
              <p class="result-reason">Answer six questions to see whether a script, an AI workflow, an assistant or an agent is a useful starting point.</p>
              <p>There is no score to chase. Changing one answer can change the recommendation.</p>
            </>}
          </div>
          {result && <button class="result-copy" onClick={copy}>Copy assessment <span aria-hidden="true">↗</span></button>}
          <p role="status" class="copy-status">{copied}</p>
          <button class="result-reset" disabled={!completed} onClick={() => { setAnswers({}); setCopied(''); }}>Reset answers</button>
          <p class="result-note">A transparent, rule-based design aid. No model call, saved answers or hidden scoring. Your judgement still matters.</p>
        </div>
      </aside>
    </div>
  </div>;
}
