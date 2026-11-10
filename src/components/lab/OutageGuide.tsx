import { useState } from 'preact/hooks';
import {
  questions,
  examples,
  assessOutage,
  formatBrief,
  formatAiPrompt,
  formatUpdate,
} from '../../lib/outage-guide.mjs';

type ExportKind = 'brief' | 'prompt' | 'update';
type FormAnswers = Record<string, string>;

const exports: { id: ExportKind; label: string; hint: string }[] = [
  { id: 'brief', label: 'Incident brief', hint: 'For a support team' },
  { id: 'prompt', label: 'Ask an AI', hint: 'Use any assistant' },
  { id: 'update', label: 'Status update', hint: 'For affected people' },
];

export default function OutageGuide({ domainReport = '' }: { domainReport?: string }) {
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [activeExport, setActiveExport] = useState<ExportKind>('brief');
  const [message, setMessage] = useState('');
  const [exampleLoaded, setExampleLoaded] = useState(false);
  const assessment = assessOutage(answers);
  const completed = questions.filter(question => answers[question.id]).length;

  function update(id: string, value: string) {
    setAnswers(previous => ({ ...previous, [id]: value }));
    setMessage('');
  }

  function tryExample(values: FormAnswers) {
    setAnswers({ ...values });
    setActiveExport('brief');
    setExampleLoaded(true);
    setMessage('Example loaded. Edit the answers before you share a report.');
  }

  function reset() {
    setAnswers({});
    setActiveExport('brief');
    setExampleLoaded(false);
    setMessage('Answers cleared from this page.');
  }

  const exportedText = assessment
    ? (activeExport === 'brief' ? formatBrief(answers, assessment)
      : activeExport === 'prompt' ? formatAiPrompt(answers, assessment)
      : formatUpdate(answers, assessment)) + (domainReport ? '\n\n' + domainReport : '')
    : '';

  async function copy() {
    if (!exportedText) return;
    try {
      await navigator.clipboard.writeText(exportedText);
      setMessage('Copied ' + exports.find(item => item.id === activeExport)?.label.toLowerCase() + '. Check it before sharing.');
    } catch {
      setMessage('Clipboard access failed. Select the text in the preview and copy it manually.');
    }
  }

  function download() {
    if (!exportedText) return;
    const blob = new Blob([exportedText + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'soft-cat-outage-' + activeExport + '.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('Text file prepared. Check your browser downloads.');
  }

  return <div class="outage-tool">
    <section class="outage-examples" aria-label="Worked examples">
      <div>
        <span class="outage-small-label">START WITH A REAL PROBLEM</span>
        <p>Or try a fictional example to see how the guide works.</p>
      </div>
      <div class="outage-example-actions">
        {examples.map(example => <button type="button" key={example.name} onClick={() => tryExample(example.answers)}>
          {example.name} <span aria-hidden="true">↗</span>
        </button>)}
      </div>
    </section>

    <div class="outage-grid">
      <div class="outage-form">
        <div class="outage-form-heading">
          <div>
            <span class="outage-small-label">01 / FIND THE FIRST CHECK</span>
            <h2>What have you seen?</h2>
          </div>
          <span class="outage-progress" aria-label={completed + ' of 3 questions answered'}>{completed}/3</span>
        </div>
        <p class="outage-assurance">There are no hidden tests. Your answers do not leave this page.</p>

        {questions.map((question, index) => <fieldset class="outage-question" key={question.id}>
          <legend><span>{String(index + 1).padStart(2, '0')}</span>{question.title}</legend>
          <p class="outage-hint">{question.hint}</p>
          <div class="outage-options">
            {question.options.map(option => <label key={option.value} class={answers[question.id] === option.value ? 'is-selected' : ''}>
              <input type="radio" name={question.id} value={option.value}
                checked={answers[question.id] === option.value}
                onChange={() => update(question.id, option.value)} />
              <span><strong>{option.label}</strong><small>{option.detail}</small></span>
            </label>)}
          </div>
        </fieldset>)}

        <details class="outage-extra">
          <summary>Add details to your report <span>optional</span></summary>
          <div class="outage-extra-fields">
            <label>App or website name
              <input type="text" maxLength={120} placeholder="For example, a video call app" value={answers.service || ''}
                onInput={event => update('service', (event.currentTarget as HTMLInputElement).value)} />
            </label>
            <label>When did the problem start?
              <input type="text" maxLength={100} placeholder="For example, 14:30 BST today" value={answers.started || ''}
                onInput={event => update('started', (event.currentTarget as HTMLInputElement).value)} />
            </label>
            <label>What else did you observe?
              <textarea rows={4} maxLength={600} placeholder="Add exact errors or tests you have made. Remove private information." value={answers.notes || ''}
                onInput={event => update('notes', (event.currentTarget as HTMLTextAreaElement).value)} />
            </label>
          </div>
          <p>Never enter passwords, tokens, account numbers or customer records.</p>
        </details>
        <button type="button" class="outage-reset" disabled={completed === 0 && !answers.service && !answers.started && !answers.notes} onClick={reset}>
          Clear answers <span aria-hidden="true">↺</span>
        </button>
      </div>

      <aside class="outage-output" aria-label="Suggested next step and export">
        <div class={'outage-result ' + (assessment?.path === 'security' ? 'is-warning' : '')}>
          <div class="outage-result-top"><span>YOUR NEXT SAFE STEP</span><span>{assessment ? 'CHECK, NOT A DIAGNOSIS' : 'AWAITING OBSERVATIONS'}</span></div>
          <div class="outage-meter" role="progressbar" aria-label="Answers completed" aria-valuemin={0} aria-valuemax={3} aria-valuenow={completed}>
            <span style={{ width: (completed / 3 * 100) + '%' }} />
          </div>
          {assessment ? <>
            <p class="outage-result-category">Suggested path</p>
            <h2>{assessment.title}</h2>
            <p class="outage-result-why">{assessment.why}</p>
            <h3>Do these checks next</h3>
            <ol>{assessment.next.map(step => <li key={step}>{step}</li>)}</ol>
            <h3>Who to involve</h3>
            <p>{assessment.involve}</p>
            <div class="outage-caution"><strong>Be careful</strong><p>{assessment.caution}</p></div>
          </> : <>
            <h2>Start with three answers.</h2>
            <p class="outage-result-why">A quick comparison can save time and stop a wrong fix.</p>
            <p class="outage-empty-text">We will suggest a safe test, identify who can help, and prepare a report you can share.</p>
          </>}
          <p class="outage-rule">{assessment ? 'Why this route: ' + assessment.rule : 'Nothing is scanned or checked in the background.'}</p>
        </div>

        {assessment && <div class="outage-export" id="outage-export">
          <div class="outage-export-heading">
            <span class="outage-small-label">02 / TAKE IT AWAY</span>
            <h2>Make the evidence useful.</h2>
            <p>Turn your answers into something you can send or discuss.</p>
          </div>
          <div class="outage-export-tabs" role="group" aria-label="Choose an output">
            {exports.map(item => <button key={item.id} type="button" aria-pressed={activeExport === item.id}
              class={activeExport === item.id ? 'is-active' : ''}
              onClick={() => { setActiveExport(item.id); setMessage(''); }}>
              <strong>{item.label}</strong><small>{item.hint}</small>
            </button>)}
          </div>
          <label class="outage-preview-label" for="outage-preview">Your copyable text preview</label>
          <textarea id="outage-preview" class="outage-preview" rows={12} readOnly value={exportedText} />
          <p class="outage-private-warning">Review before sharing. Remove names, private data, logs and account details. An AI service may store what you paste.</p>
          <div class="outage-export-actions">
            <button type="button" onClick={copy}>Copy text <span aria-hidden="true">↗</span></button>
            <button type="button" class="outage-download" onClick={download}>Save .txt <span aria-hidden="true">↓</span></button>
          </div>
        </div>}
        <p role="status" aria-live="polite" class="outage-status">{message}</p>
        {exampleLoaded && <p class="outage-example-flag">You are viewing fictional example answers. Replace them before sharing.</p>}
      </aside>
    </div>
  </div>;
}
