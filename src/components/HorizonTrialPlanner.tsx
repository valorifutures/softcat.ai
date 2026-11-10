import { useEffect, useRef, useState } from 'preact/hooks';
import { emptyTrialDraft, trialBrief, TRIAL_FIELD_LIMIT, updateTrialDraft } from '../lib/horizon-trial.mjs';
import { formatClockDate } from '../lib/horizon-clocks.mjs';
import type { CurrentPrediction } from '../lib/horizon-prediction-types';
import type { DecisionBrief } from '../lib/horizon-types';
import '../styles/horizon-trial.css';

type Draft = { task: string; owner: string; baseline: string; success: string; stop: string };
type Props = { record: CurrentPrediction; brief: DecisionBrief; ready: boolean };

export default function HorizonTrialPlanner({ record, brief, ready }: Props) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [status, setStatus] = useState('');
  const [fallback, setFallback] = useState('');
  const request = useRef(0);
  const context = useRef('');
  context.current = `${record.id}:${record.event_id}`;
  const draft: Draft = drafts[record.id] || emptyTrialDraft();
  const completed = Object.values(draft).filter(value => value.trim()).length;

  function clearExport() { request.current += 1; setStatus(''); setFallback(''); }
  useEffect(clearExport, [record.id, record.event_id]);
  useEffect(() => () => { request.current += 1; }, []);

  function edit(field: keyof Draft, value: string) {
    clearExport();
    setDrafts(previous => updateTrialDraft(previous, record.id, field, value));
  }

  async function copy() {
    clearExport();
    const token = request.current;
    const selectedContext = context.current;
    const text = trialBrief(record, brief, draft);
    setStatus('Copying trial brief…');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Clipboard unavailable')), 1500); }),
      ]);
      if (request.current === token && context.current === selectedContext) setStatus('Trial brief copied, with forecast context and sources.');
    } catch {
      if (request.current !== token || context.current !== selectedContext) return;
      setFallback(text); setStatus('Copy was unavailable. Select the complete brief below.');
    } finally { clearTimeout(timeout); }
  }

  function download() {
    clearExport();
    try {
      const url = URL.createObjectURL(new Blob([trialBrief(record, brief, draft)], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url; link.download = `softcat-${record.id.replace('scenario-', '')}-trial.txt`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('Text download requested. It includes your brief and the current forecast sources.');
    } catch {
      setFallback(trialBrief(record, brief, draft)); setStatus('Download was unavailable. Select the complete brief below.');
    }
  }

  return <aside class="hz-trial" id="horizon-decision" aria-labelledby="decision-title">
    <header class="hz-trial-header">
      <p class="hz-label">Think 10×. Start with 90 days.</p>
      <div class="hz-trial-heading"><h3 id="decision-title">Start small.<br />Learn something real.</h3><span aria-hidden="true">90<small>days</small></span></div>
      <p class="hz-trial-question">{brief.question}</p>
      <p class="hz-trial-context">Your trial / <strong>{record.title}</strong></p>
    </header>
    <div class="hz-trial-body">
      <div class="hz-trial-start">
        <h4>Your first step</h4>
        <p>{brief.moves.pragmatic}</p>
        <p><strong>What to measure</strong>{brief.measure}</p>
      </div>
      <details class="hz-trial-builder">
      <summary>Build your trial brief <span aria-hidden="true">+</span></summary>
      <p class="hz-trial-instruction">Choose one task. Keep a person in charge. Agree the success and stop rules before the trial.</p>
      <ol class="hz-trial-phases" aria-label="Suggested 90-day plan"><li><strong>Days 1–30</strong>Measure the current process.</li><li><strong>Days 31–60</strong>Run a supervised test.</li><li><strong>Days 61–90</strong>Compare results and decide.</li></ol>
      <fieldset class="hz-trial-stage" disabled={!ready}>
        <legend><span>01</span> Define the trial <small>Before starting</small></legend>
        <label htmlFor="trial-task">What will you test?</label>
        <textarea id="trial-task" rows={2} maxLength={TRIAL_FIELD_LIMIT} value={draft.task} placeholder="Name one task. State what the trial includes and excludes." onInput={event => edit('task', event.currentTarget.value)} />
        <label htmlFor="trial-owner">Who is responsible?</label>
        <input id="trial-owner" maxLength={TRIAL_FIELD_LIMIT} value={draft.owner} placeholder="Who reviews exceptions and can stop the trial?" onInput={event => edit('owner', event.currentTarget.value)} />
      </fieldset>
      <fieldset class="hz-trial-stage" disabled={!ready}>
        <legend><span>02</span> Compare real work <small>During the trial</small></legend>
        <p>Record the current result first. Include difficult cases, failures and human help in the trial.</p>
        <label htmlFor="trial-baseline">What will you measure?</label>
        <textarea id="trial-baseline" rows={2} maxLength={TRIAL_FIELD_LIMIT} value={draft.baseline} placeholder="What happens today? Use the same measure for the trial." aria-describedby="trial-measure" onInput={event => edit('baseline', event.currentTarget.value)} />
        <p id="trial-measure" class="hz-trial-hint">{brief.measure}</p>
      </fieldset>
      <fieldset class="hz-trial-stage" disabled={!ready}>
        <legend><span>03</span> Agree decision rules <small>Before starting</small></legend>
        <p>Use the results to decide whether to continue, change or stop.</p>
        <label htmlFor="trial-success">What result would count as success?</label>
        <textarea id="trial-success" rows={2} maxLength={TRIAL_FIELD_LIMIT} value={draft.success} placeholder="What improvement would justify continuing, with quality intact?" onInput={event => edit('success', event.currentTarget.value)} />
        <label htmlFor="trial-stop">When will you stop?</label>
        <textarea id="trial-stop" rows={2} maxLength={TRIAL_FIELD_LIMIT} value={draft.stop} placeholder="When do we pause, and how do we return work to a person?" onInput={event => edit('stop', event.currentTarget.value)} />
      </fieldset>
      <div class="hz-trial-export">
        <p class="hz-trial-count">{completed} of 5 fields filled <span>Unfilled fields export as “To decide”.</span></p>
        <div class="hz-trial-actions"><button class="hz-trial-copy" type="button" disabled={!ready} onClick={copy}>Copy trial brief <span aria-hidden="true">↗</span></button><button class="hz-trial-download" type="button" disabled={!ready} onClick={download}>Download .txt</button></div>
        <p class="hz-trial-status" role="status">{status}</p>
        {fallback && <label class="hz-trial-fallback">Your trial brief<textarea readOnly value={fallback} onFocus={event => event.currentTarget.select()} /></label>}
        <p class="hz-trial-privacy">Each prediction keeps its own draft in this open page. We do not save or send your text. Copy or download it before you leave.</p>
        <p class="hz-trial-footnote">Exports include the forecast reviewed <time dateTime={record.reviewed_at}>{formatClockDate(record.reviewed_at)}</time> and its sources. Your trial does not change our prediction.</p>
      </div>
      </details>
    </div>
  </aside>;
}
