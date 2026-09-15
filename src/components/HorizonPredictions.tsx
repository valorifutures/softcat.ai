import { useEffect, useRef, useState } from 'preact/hooks';
import { FUTURES, readHorizonState } from '../lib/horizon-explorer.mjs';
import { CLOCK_REFRESH_MS, formatClockDate } from '../lib/horizon-clocks.mjs';
import { latestPredictions, predictionBriefing, predictionCaption, predictionClock, predictionHistory, predictionTargetLabel, validatePredictionPayload } from '../lib/horizon-predictions.mjs';
import type { CurrentPrediction, PredictionData } from '../lib/horizon-prediction-types';
import type { DecisionBrief, Evidence } from '../lib/horizon-types';

type Props = { initialData: PredictionData; initialNow: number; briefs: DecisionBrief[] };

function Sources({ evidence }: { evidence: Evidence[] }) {
  return <div class="hz-source-grid">{evidence.map(source => <article class="hz-source" key={source.url}>
    <p class="hz-source-date">{source.date_label}</p>
    <h3><a href={source.url}>{source.title} ↗</a></h3>
    <p>{source.finding}</p><p class="hz-source-limit"><strong>The limit</strong>{source.limit}</p>
  </article>)}</div>;
}

export default function HorizonPredictions({ initialData, initialNow, briefs }: Props) {
  const [data, setData] = useState(initialData);
  const currentData = useRef(initialData);
  const [future, setFuture] = useState('agents');
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(initialNow);
  const [live, setLive] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [refreshState, setRefreshState] = useState('');
  const checkReview = useRef<() => void>(() => {});
  const [copyState, setCopyState] = useState('');
  const [copyFallback, setCopyFallback] = useState('');
  const copyRequest = useRef(0);
  const records: CurrentPrediction[] = latestPredictions(data.history);
  const selectedFuture = FUTURES.find(item => item.key === future)!;
  const selected = records.find(item => item.id === selectedFuture.id)!;
  const brief = briefs.find(item => item.id === selected.id)!;
  const entries = predictionHistory(data.history, selected.id);
  const selectedDays = predictionCaption(predictionClock(selected, now));
  const latestReview = entries.at(-1)!;

  function clearCopy() { copyRequest.current += 1; setCopyState(''); setCopyFallback(''); }

  useEffect(() => {
    const restore = () => { setFuture(readHorizonState(window.location.search).future); clearCopy(); };
    restore(); setReady(true);
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(timer);
      if (document.visibilityState === 'hidden') return;
      const current = Date.now();
      setNow(current); setLive(true);
      // Every target ends on a UTC date. Recalculate just after midnight,
      // and immediately when a suspended or hidden page becomes visible.
      timer = setTimeout(sync, 86400000 - current % 86400000 + 1);
    };
    sync(); document.addEventListener('visibilitychange', sync);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', sync); };
  }, []);

  useEffect(() => {
    let stopped = false;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (stopped || controller || document.visibilityState === 'hidden') return;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      setRefreshState('Checking published predictions…');
      try {
        const response = await fetch('/horizon/prediction-data.json', { cache: 'no-cache', signal: controller.signal });
        if (!response.ok) throw new Error('Prediction unavailable');
        const next: PredictionData = await response.json();
        if (validatePredictionPayload(next, currentData.current.history).length) throw new Error('Prediction could not be verified');
        if (stopped) return;
        if (next.revision !== currentData.current.revision) {
          currentData.current = next; setData(next); setNow(Date.now()); clearCopy();
          setAnnouncement('Published predictions updated. Days recalculated from each current target. Your selected future is preserved.');
          setRefreshState('Days recalculated from the new published review');
        } else setRefreshState('Published predictions checked');
      } catch { if (!stopped) setRefreshState('Update check unavailable. Showing the last verified predictions.'); }
      finally { clearTimeout(timeout); controller = undefined; }
    };
    checkReview.current = refresh; refresh();
    const timer = setInterval(refresh, CLOCK_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => { stopped = true; clearInterval(timer); controller?.abort(); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  function predictionUrl(key: string) {
    const url = new URL(window.location.href);
    url.searchParams.set('future', key); url.searchParams.delete('view'); url.hash = '';
    return url;
  }

  function choose(key: string) {
    if (key === future) return;
    setFuture(key); clearCopy();
    window.history.pushState(null, '', predictionUrl(key));
    const record = records.find(item => item.id === FUTURES.find(item => item.key === key)!.id)!;
    setAnnouncement(`Our ${record.title} prediction. ${predictionTargetLabel(record)}. ${predictionCaption(predictionClock(record, now)).summary}. Milestone, reasoning, evidence and history updated below.`);
  }

  async function copy(value: string, kind: 'link' | 'briefing') {
    clearCopy(); const request = copyRequest.current;
    setCopyState('Copying…');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        navigator.clipboard.writeText(value),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Clipboard unavailable')), 1500); }),
      ]);
      if (request === copyRequest.current) setCopyState(kind === 'link' ? 'Prediction link copied' : 'Prediction briefing copied with sources');
    } catch {
      if (request !== copyRequest.current) return;
      setCopyState('Select and copy the text below'); setCopyFallback(value);
    } finally { clearTimeout(timeout); }
  }

  return <div class="hz-explorer hz-predictions" id="outlook">
    <div class="hz-toolbar"><div><h2>Five predictions. Five day counts.</h2><p>Days remaining to each milestone, recalculated when our prediction changes.</p></div><a class="hz-text-button" href="/horizon/scenarios/">Compare alternative scenarios ↗</a><a class="hz-mobile-detail" href="#horizon-prediction">Read selected prediction: {selected.title} ↓</a></div>
    <section class="hz-clocks" aria-label="Our five prediction countdowns">
      <div class="hz-clocks-heading"><p><span class="hz-clock-dot" aria-hidden="true" />{live ? 'Days remaining as of' : 'Snapshot'} {formatClockDate(now)} · UTC</p><a href="#horizon-prediction-history">What changed the estimate? ↓</a></div>
      <div class="hz-clock-grid" role="group" aria-label="Choose our prediction">
        {FUTURES.map(({ key, id }, index) => {
          const record = records.find(item => item.id === id)!;
          const clock = predictionClock(record, now);
          const caption = predictionCaption(clock);
          const latest = predictionHistory(data.history, id).at(-1)!;
          return <button type="button" key={key} class="hz-clock" disabled={!ready} aria-pressed={future === key} aria-controls="horizon-prediction horizon-decision horizon-evidence horizon-prediction-history" aria-label={`${record.title}. Our prediction: ${predictionTargetLabel(record)}. ${record.milestone} ${caption.summary}. ${latest.movement.label}. Explore this prediction.`} onClick={() => choose(key)}>
            <span class="hz-clock-top"><span>0{index + 1}</span><span aria-hidden="true">{future === key ? 'Selected ↙' : 'Explore ↗'}</span></span>
            <span class="hz-clock-title">{record.title}</span>
            <span class={`hz-clock-face ${clock.target === null ? 'hz-clock-undated' : ''}`} aria-hidden="true">
              {clock.target !== null ? <><span class="hz-clock-days">{caption.value}<small>{caption.unit}</small></span><span class="hz-clock-label">{caption.destination}</span></> : <><span>Review due</span><span class="hz-clock-label">Prediction deadline elapsed</span></>}
            </span>
            <span class="hz-prediction-date">Our prediction<br /><strong>{predictionTargetLabel(record)}</strong></span>
            <span class="hz-prediction-milestone">{record.milestone}</span>
            <span class="hz-clock-change">{latest.movement.label}{latest.movement.kind === 'scope' && latest.movement.dateChangeLabel && <span>{latest.movement.dateChangeLabel}</span>}<span>{latest.previous ? 'Last evidence review' : 'No evidence revision yet'} · <time dateTime={record.reviewed_at}>{formatClockDate(record.reviewed_at)}</time></span></span>
          </button>;
        })}
      </div>
      <p class="hz-clock-note"><strong>Time removes days. Evidence can change the estimate.</strong> Each count follows its own prediction. A review can add or remove days for that future, with the reason recorded below. Forecasts with the same target date share a day count. <a href="#method">How we calculate the days ↓</a></p>
    </section>
    <div class="hz-refresh"><a class="hz-text-button" href="#horizon-prediction">Read our {selected.title.toLowerCase()} prediction ↓</a><p role="status">{refreshState || 'Published predictions refresh while this page is open.'}</p><button type="button" disabled={!ready || refreshState === 'Checking published predictions…'} onClick={() => checkReview.current()}>Check for a new review</button></div>
    <div class="hz-prediction-workspace">
      <section class="hz-prediction-detail" id="horizon-prediction" aria-labelledby="prediction-title">
        <p class="hz-label">Our prediction / {selected.title}</p>
        <h2 id="prediction-title">{predictionTargetLabel(selected)},<br />we expect this.</h2>
        <p class="hz-prediction-claim">{selected.milestone}</p>
        <p class="hz-prediction-stamp">Deadline: <time dateTime={selected.target_date}>{formatClockDate(selected.target_date)}</time> · Reviewed <time dateTime={selected.reviewed_at}>{formatClockDate(selected.reviewed_at)}</time></p>
        <div class="hz-day-calculation"><h3>What sets this day count?</h3><p>{selectedDays.summary}. We subtract the current time from this prediction's target date.</p><p><strong>{latestReview.movement.label}.</strong> {latestReview.previous ? latestReview.movement.kind === 'scope' && latestReview.movement.dateChangeLabel ? `${latestReview.movement.dateChangeLabel}. Read the changed milestone and review below.` : 'This is the effect of the latest evidence review, separate from days passing.' : 'An evidence review has not moved this target yet.'}</p></div>
        <h3>Why this estimate?</h3><p>{selected.rationale}</p>
        <h3>Where we could be wrong</h3><p>{selected.uncertainty}</p>
        <details class="hz-prediction-test" key={selected.id}><summary>What would count as this prediction coming true?</summary><p>These are our published resolution criteria. We will assess the evidence against them and record the outcome.</p><ol>{selected.resolution.map(item => <li key={item}>{item}</li>)}</ol></details>
        <div class="hz-prediction-signals"><div><h3>What would move it earlier</h3><p>{selected.earlier}</p></div><div><h3>What would move it later</h3><p>{selected.later}</p></div></div>
        <div class="hz-map-actions"><button type="button" class="hz-text-button" disabled={!ready} onClick={() => copy(predictionBriefing(data.history, selected.id, brief, now), 'briefing')}>Copy prediction briefing</button><button type="button" class="hz-text-button" disabled={!ready} onClick={() => copy(predictionUrl(future).href, 'link')}>Copy prediction link</button><span class="hz-copy-status" role="status">{copyState}</span></div>
        {copyFallback && <label class="hz-share-fallback">Text to copy<textarea readOnly value={copyFallback} onFocus={event => event.currentTarget.select()} /></label>}
      </section>
      <aside class="hz-detail hz-prediction-action" id="horizon-decision" aria-labelledby="decision-title"><p class="hz-label">Think 10×. Start with 90 days.</p><h3 id="decision-title">{brief.question}</h3><div class="hz-next-move"><span aria-hidden="true">90</span><div><h4>Your next 90 days</h4><p>{brief.moves.pragmatic}</p></div></div><p class="hz-measure"><strong>Know if it works</strong>{brief.measure}</p></aside>
    </div>
    <section class="hz-evidence" id="horizon-evidence" aria-labelledby="evidence-title"><div class="hz-section-heading"><div><p class="hz-label">The evidence behind our call</p><h2 id="evidence-title">{selected.title}: what we know.</h2></div><p>Reviewed {formatClockDate(selected.reviewed_at)}</p></div><p class="hz-assessment">These sources inform our judgement. They do not determine the target date. We explain what each supports and what it leaves unanswered.</p><Sources evidence={selected.evidence} /></section>
    <section class="hz-clock-history" id="horizon-prediction-history" aria-labelledby="history-title"><div class="hz-section-heading"><div><p class="hz-label">Accountable to our earlier calls</p><h2 id="history-title">Prediction history.</h2></div><p>{selected.title}</p></div><p class="hz-history-intro">Every published prediction stays in the record, including its original date, milestone and evidence. A revision adds a new entry.</p>{[...entries].reverse().map(entry => <details class="hz-history-entry" key={`${selected.id}-${entry.id}`}><summary><time dateTime={entry.date}>{formatClockDate(entry.date)}</time><span class="hz-history-movement">{entry.movement.label}</span><span class="hz-history-window">{predictionTargetLabel(entry.record)}</span><span class="hz-history-open"><span>Read ↓</span><span>Close ↑</span></span></summary><div class="hz-history-body"><p>{entry.reason}</p>{entry.previous && <p><strong>Change at this review: </strong>{entry.movement.label}.{entry.movement.kind === 'scope' && entry.movement.dateChangeLabel && ` ${entry.movement.dateChangeLabel}.`} Passing days are not included in this change.</p>}<p><strong>Our prediction: </strong>{entry.record.milestone}</p><p><strong>Deadline: </strong>{formatClockDate(entry.record.target_date)}</p><p><strong>What would count</strong></p><ol class="hz-resolution-list">{entry.record.resolution.map((item: string) => <li key={item}>{item}</li>)}</ol><p><strong>Why this estimate: </strong>{entry.record.rationale}</p><p><strong>Uncertainty: </strong>{entry.record.uncertainty}</p><p><strong>Earlier: </strong>{entry.record.earlier}</p><p><strong>Later: </strong>{entry.record.later}</p><Sources evidence={entry.record.evidence} /></div></details>)}</section>
    <span class="sr-only" role="status">{announcement}</span>
    <noscript><p class="hz-noscript">The five predictions above are a published snapshot. Enable JavaScript to switch the detailed view and run the clocks, or <a href="/llms-full.txt">read every prediction and its resolution criteria in the text edition</a>.</p></noscript>
  </div>;
}
