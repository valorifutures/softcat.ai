import { useEffect, useRef, useState } from 'preact/hooks';
import { FUTURES, readHorizonState } from '../lib/horizon-explorer.mjs';
import { CLOCK_REFRESH_MS, formatClockDate } from '../lib/horizon-clocks.mjs';
import { latestPredictions, predictionBriefing, predictionCaption, predictionClock, predictionHistory, predictionTargetLabel, validatePredictionPayload } from '../lib/horizon-predictions.mjs';
import type { CurrentPrediction, PredictionData } from '../lib/horizon-prediction-types';
import type { DecisionBrief, Evidence } from '../lib/horizon-types';
import HorizonTrialPlanner from './HorizonTrialPlanner';
import guides from '../data/horizon/reader-guides.json';
import { matchingPredictionGuide, shortMovement } from '../lib/horizon-reader.mjs';

type Props = { initialData: PredictionData; initialNow: number; briefs: DecisionBrief[] };

function Sources({ evidence }: { evidence: Evidence[] }) {
  return <div class="hz-source-grid">{evidence.map(source => <article class="hz-source" key={source.url}>
    <p class="hz-source-date">{source.date_label}</p>
    <h3><a href={source.url}>{source.title} ↗</a></h3>
    <p>{source.finding}</p><p class="hz-source-limit"><strong>What this does not prove</strong>{source.limit}</p>
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
  const guide = matchingPredictionGuide(selected, guides);
  const newestFirst = [...entries].reverse();

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
        } else setRefreshState('Latest published review checked');
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

  return <div class="hz-explorer hz-predictions hz-clear" id="outlook">
    <div class="hz-toolbar"><div><p class="hz-label">01 / Choose a prediction</p><h2>Five changes worth preparing for.</h2></div><p class="hz-forecast-note">Forecast dates can change. These are not arrival dates.</p></div>
    <section class="hz-clocks" aria-label="Our five prediction countdowns">
      <div class="hz-clocks-heading"><p><span class="hz-clock-dot" aria-hidden="true" />{live ? 'Days remaining as of' : 'Snapshot'} {formatClockDate(now)} · UTC</p><a href="#method">How the clocks work ↓</a></div>
      <div class="hz-clock-grid" role="group" aria-label="Choose our prediction">
        {FUTURES.map(({ key, id }, index) => {
          const record = records.find(item => item.id === id)!;
          const clock = predictionClock(record, now);
          const caption = predictionCaption(clock);
          const latest = predictionHistory(data.history, id).at(-1)!;
          const cardGuide = matchingPredictionGuide(record, guides);
          return <button type="button" key={key} class="hz-clock" disabled={!ready} aria-pressed={future === key} aria-controls="horizon-prediction horizon-decision horizon-evidence horizon-prediction-history" aria-label={`${record.title}. Our prediction: ${predictionTargetLabel(record)}. ${record.milestone} ${caption.summary}. ${latest.movement.label}. Explore this prediction.`} onClick={() => choose(key)}>
            <span class="hz-clock-top"><span>0{index + 1}</span><span aria-hidden="true">{future === key ? 'Selected ✓' : 'Explore ↗'}</span></span>
            <span class="hz-clock-title">{record.title}</span>
            <span class={`hz-clock-face ${clock.target === null ? 'hz-clock-undated' : ''}`} aria-hidden="true">
              {clock.target !== null ? <><span class="hz-clock-days">{caption.value}<small>{caption.unit}</small></span><span class="hz-clock-label">{caption.destination}</span></> : <><span>Review due</span><span class="hz-clock-label">Prediction deadline elapsed</span></>}
            </span>
            <span class="hz-prediction-date"><strong>{predictionTargetLabel(record)}</strong></span>
            <span class="hz-prediction-milestone">{cardGuide?.headline || record.milestone}</span>
            <span class="hz-clock-change">{shortMovement(latest.movement)}{latest.movement.kind === 'scope' && latest.movement.dateChangeLabel && <span>{latest.movement.dateChangeLabel}</span>}<span>Reviewed <time dateTime={record.reviewed_at}>{formatClockDate(record.reviewed_at)}</time></span></span>
          </button>;
        })}
      </div>
      <p class="hz-clock-note"><strong>Time reduces the count. Evidence can move the date.</strong> We record the reason for every change. <a href="#horizon-prediction-history">See the review history ↓</a></p>
    </section>
    <nav class="hz-section-nav" aria-label="Explore the selected prediction">
      <a class="hz-selected-link" href="#horizon-prediction">Read {selected.title.toLowerCase()} ↓</a><a href="#horizon-evidence">Check the evidence ↓</a><a href="#horizon-decision">Plan a 90-day trial ↓</a>
    </nav>
    <div class="hz-prediction-workspace">
      <section class="hz-prediction-detail" id="horizon-prediction" aria-labelledby="prediction-title">
        <p class="hz-label">02 / Understand the prediction · {selected.title}</p>
        <p class="hz-guide-date">Our forecast: <strong>{predictionTargetLabel(selected)}</strong></p>
        <h2 id="prediction-title">{guide?.headline || selected.milestone}</h2>
        {guide && <p class="hz-guide-meaning">{guide.meaning}</p>}
        <p class="hz-prediction-stamp">Deadline: <time dateTime={selected.target_date}>{formatClockDate(selected.target_date)}</time> · Evidence reviewed <time dateTime={selected.reviewed_at}>{formatClockDate(selected.reviewed_at)}</time></p>
        {guide && <div class="hz-proof">
          <h3>Key parts of our test</h3>
          <dl>{guide.checks.map(check => <div key={check.label}><dt>{check.label}</dt><dd>{check.value}</dd></div>)}</dl>
          <p>{guide.boundary}</p>
        </div>}
        <p class="hz-guide-uncertainty"><strong>What remains uncertain</strong>{selected.uncertainty}</p>
        <details class="hz-prediction-test" key={`test-${selected.id}`}><summary>Read the full prediction and its test</summary><p><strong>Published prediction</strong></p><p>{selected.milestone}</p><p>All of these conditions must hold. Use this full test to assess the outcome.</p><ol>{selected.resolution.map(item => <li key={item}>{item}</li>)}</ol></details>
        <div class="hz-review-strip"><div><span>Latest review</span><strong>{shortMovement(latestReview.movement)}</strong></div><p>{latestReview.movement.kind === 'unchanged' ? 'The latest evidence review added or removed 0 days.' : latestReview.movement.dateChangeLabel || latestReview.movement.label} <a href="#horizon-prediction-history">Read the record ↓</a></p></div>
        <details class="hz-prediction-test hz-review-detail" key={`review-${selected.id}`}><summary>Why we chose this date</summary><p>{selected.rationale}</p><div class="hz-prediction-signals"><div><h3>What could bring it forward</h3><p>{selected.earlier}</p></div><div><h3>What could delay it</h3><p>{selected.later}</p></div></div><h3>How we count the days</h3><p>{selectedDays.summary}. The count runs to the end of the target date in UTC.</p></details>
        <div class="hz-map-actions"><button type="button" class="hz-text-button" disabled={!ready} onClick={() => copy(predictionBriefing(data.history, selected.id, brief, now), 'briefing')}>Copy full prediction</button><button type="button" class="hz-text-button" disabled={!ready} onClick={() => copy(predictionUrl(future).href, 'link')}>Copy link</button><span class="hz-copy-status" role="status">{copyState}</span></div>
        {copyFallback && <label class="hz-share-fallback">Text to copy<textarea readOnly value={copyFallback} onFocus={event => event.currentTarget.select()} /></label>}
      </section>
      <HorizonTrialPlanner record={selected} brief={brief} ready={ready} />
    </div>
    <section class="hz-evidence" id="horizon-evidence" aria-labelledby="evidence-title"><div class="hz-section-heading"><div><p class="hz-label">03 / Check the evidence</p><h2 id="evidence-title">What supports this prediction?</h2></div><p>{selected.title} · Reviewed {formatClockDate(selected.reviewed_at)}</p></div><p class="hz-assessment">Read what each source reports and what it does not prove. These sources inform our forecast. They do not calculate the date.</p><Sources evidence={selected.evidence} /></section>
    <section class="hz-clock-history" id="horizon-prediction-history" aria-labelledby="history-title"><div class="hz-section-heading"><div><p class="hz-label">Every review stays on record</p><h2 id="history-title">Did our view change?</h2></div><p>{selected.title} · {entries.length} published {entries.length === 1 ? 'record' : 'records'}</p></div><p class="hz-history-intro">Compare the dates, reasons and evidence. Earlier predictions stay exactly as we published them.</p>
      {newestFirst.slice(0, 3).map(entry => <HistoryEntry key={`${selected.id}-${entry.id}`} entry={entry} />)}
      {newestFirst.length > 3 && <details class="hz-older-history" key={`older-${selected.id}`}><summary>Show {newestFirst.length - 3} earlier records, including our first prediction</summary>{newestFirst.slice(3).map(entry => <HistoryEntry key={`${selected.id}-${entry.id}`} entry={entry} />)}</details>}
    </section>
    <div class="hz-refresh"><p role="status">{refreshState || 'This page checks for new reviews every five minutes.'}</p><button type="button" disabled={!ready || refreshState === 'Checking published predictions…'} onClick={() => checkReview.current()}>Check for a new review</button></div>
    <span class="sr-only" role="status">{announcement}</span>
    <noscript><p class="hz-noscript">The five predictions above are a published snapshot. Enable JavaScript to choose a prediction and update the clocks. You can also <a href="/llms-full.txt">read all five predictions in the text edition</a>.</p></noscript>
  </div>;
}

function HistoryEntry({ entry }: { entry: ReturnType<typeof predictionHistory>[number] }) {
  return <details class="hz-history-entry"><summary><time dateTime={entry.date}>{formatClockDate(entry.date)}</time><span class="hz-history-movement">{shortMovement(entry.movement)}</span><span class="hz-history-window">{predictionTargetLabel(entry.record)}</span><span class="hz-history-open"><span>Read ↓</span><span>Close ↑</span></span></summary><div class="hz-history-body"><p>{entry.reason}</p>{entry.previous && <p><strong>Change at this review: </strong>{entry.movement.label}.{entry.movement.kind === 'scope' && entry.movement.dateChangeLabel && ` ${entry.movement.dateChangeLabel}.`} This change excludes the days that passed between reviews.</p>}<p><strong>Our prediction: </strong>{entry.record.milestone}</p><p><strong>Deadline: </strong>{formatClockDate(entry.record.target_date)}</p><p><strong>The full test</strong></p><ol class="hz-resolution-list">{entry.record.resolution.map((item: string) => <li key={item}>{item}</li>)}</ol><p><strong>Why we chose this date: </strong>{entry.record.rationale}</p><p><strong>Uncertainty: </strong>{entry.record.uncertainty}</p><p><strong>Earlier: </strong>{entry.record.earlier}</p><p><strong>Later: </strong>{entry.record.later}</p><Sources evidence={entry.record.evidence} /></div></details>;
}
