import { useEffect, useRef, useState } from 'preact/hooks';
import { FUTURES, readHorizonState } from '../lib/horizon-explorer.mjs';
import { CLOCK_REFRESH_MS, formatClockDate } from '../lib/horizon-clocks.mjs';
import { latestPredictions, predictionBriefing, predictionCaption, predictionClock, predictionHistory, validatePredictionPayload } from '../lib/horizon-predictions.mjs';
import type { CurrentPrediction, PredictionData } from '../lib/horizon-prediction-types';
import type { DecisionBrief, Evidence } from '../lib/horizon-types';

type Props = { initialData: PredictionData; initialNow: number; briefs: DecisionBrief[] };
const pad = (value: number) => String(value).padStart(2, '0');
const year = (date: string) => date.slice(0, 4);

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
  const [paused, setPaused] = useState(false);
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

  function clearCopy() { copyRequest.current += 1; setCopyState(''); setCopyFallback(''); }

  useEffect(() => {
    const restore = () => { setFuture(readHorizonState(window.location.search).future); clearCopy(); };
    restore(); setReady(true);
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (paused || document.visibilityState === 'hidden') return;
      setNow(Date.now()); setLive(true);
      timer = setInterval(() => setNow(Date.now()), 1000);
    };
    sync(); document.addEventListener('visibilitychange', sync);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', sync); };
  }, [paused]);

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
          currentData.current = next; setData(next); clearCopy();
          setAnnouncement('Published predictions updated. Your selected future is preserved.');
          setRefreshState('Published predictions updated');
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
    setAnnouncement(`Our ${record.title} prediction, by the end of ${year(record.target_date)}. Milestone, reasoning, evidence and history updated below.`);
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
    <div class="hz-toolbar"><div><h2>Five predictions. Pick one to explore.</h2><p>Each clock counts down to when we expect its milestone to be met.</p></div><a class="hz-text-button" href="/horizon/scenarios/">Compare alternative scenarios ↗</a><a class="hz-mobile-detail" href="#horizon-prediction">Read selected prediction: {selected.title} ↓</a></div>
    <section class="hz-clocks" aria-label="Our five prediction countdowns">
      <div class="hz-clocks-heading"><p><span class="hz-clock-dot" aria-hidden="true" />{paused ? 'Clocks paused' : live ? 'Clocks running' : `Snapshot ${formatClockDate(initialNow)}`} · UTC</p><button type="button" disabled={!ready} onClick={() => setPaused(!paused)}>{paused ? 'Resume clocks' : 'Pause clocks'}</button></div>
      <div class="hz-clock-grid" role="group" aria-label="Choose our prediction">
        {FUTURES.map(({ key, id }, index) => {
          const record = records.find(item => item.id === id)!;
          const clock = predictionClock(record, now);
          const caption = predictionCaption(clock);
          const latest = predictionHistory(data.history, id).at(-1)!;
          return <button type="button" key={key} class="hz-clock" disabled={!ready} aria-pressed={future === key} aria-controls="horizon-prediction horizon-decision horizon-evidence horizon-prediction-history" aria-label={`${record.title}. Our prediction: by end of ${year(record.target_date)}. ${record.milestone} ${caption.summary}. Explore this prediction.`} onClick={() => choose(key)}>
            <span class="hz-clock-top"><span>0{index + 1}</span><span aria-hidden="true">{future === key ? 'Selected ↙' : 'Explore ↗'}</span></span>
            <span class="hz-clock-title">{record.title}</span>
            <span class={`hz-clock-face ${clock.target === null ? 'hz-clock-undated' : ''}`} aria-hidden="true">
              {clock.target !== null ? <><span class="hz-clock-days">{caption.value}<small>{caption.unit}</small></span><span class="hz-clock-label">{caption.destination}</span><span class="hz-clock-time">{pad(clock.hours!)}<small>h</small><span>:</span>{pad(clock.minutes!)}<small>m</small><span>:</span>{pad(clock.seconds!)}<small>s</small></span></> : <><span>Review due</span><span class="hz-clock-label">Prediction deadline elapsed</span></>}
            </span>
            <span class="hz-prediction-date">Our prediction<br /><strong>By end of {year(record.target_date)}</strong></span>
            <span class="hz-prediction-milestone">{record.milestone}</span>
            <span class="hz-clock-change">{latest.movement.label}<span>Reviewed <time dateTime={record.reviewed_at}>{formatClockDate(record.reviewed_at)}</time></span></span>
          </button>;
        })}
      </div>
      <p class="hz-clock-note"><strong>Our call, open to challenge.</strong> These dates are our editorial predictions. Each has a defined milestone and a test below. The clocks use the end of the stated year; the ticking seconds do not imply that precision. <a href="#method">How we make the call ↓</a></p>
    </section>
    <div class="hz-refresh"><a class="hz-text-button" href="#horizon-prediction">Read our {selected.title.toLowerCase()} prediction ↓</a><p role="status">{refreshState || 'Published predictions refresh while this page is open.'}</p><button type="button" disabled={!ready || refreshState === 'Checking published predictions…'} onClick={() => checkReview.current()}>Check for a new review</button></div>
    <div class="hz-prediction-workspace">
      <section class="hz-prediction-detail" id="horizon-prediction" aria-labelledby="prediction-title">
        <p class="hz-label">Our prediction / {selected.title}</p>
        <h2 id="prediction-title">By end of {year(selected.target_date)},<br />we expect this.</h2>
        <p class="hz-prediction-claim">{selected.milestone}</p>
        <p class="hz-prediction-stamp">Deadline: <time dateTime={selected.target_date}>{formatClockDate(selected.target_date)}</time> · Reviewed <time dateTime={selected.reviewed_at}>{formatClockDate(selected.reviewed_at)}</time></p>
        <h3>Why {year(selected.target_date)}?</h3><p>{selected.rationale}</p>
        <h3>Where we could be wrong</h3><p>{selected.uncertainty}</p>
        <details class="hz-prediction-test" key={selected.id}><summary>What would count as this prediction coming true?</summary><p>These are our published resolution criteria. We will assess the evidence against them and record the outcome.</p><ol>{selected.resolution.map(item => <li key={item}>{item}</li>)}</ol></details>
        <div class="hz-prediction-signals"><div><h3>What would move it earlier</h3><p>{selected.earlier}</p></div><div><h3>What would move it later</h3><p>{selected.later}</p></div></div>
        <div class="hz-map-actions"><button type="button" class="hz-text-button" disabled={!ready} onClick={() => copy(predictionBriefing(data.history, selected.id, brief), 'briefing')}>Copy prediction briefing</button><button type="button" class="hz-text-button" disabled={!ready} onClick={() => copy(predictionUrl(future).href, 'link')}>Copy prediction link</button><span class="hz-copy-status" role="status">{copyState}</span></div>
        {copyFallback && <label class="hz-share-fallback">Text to copy<textarea readOnly value={copyFallback} onFocus={event => event.currentTarget.select()} /></label>}
      </section>
      <aside class="hz-detail hz-prediction-action" id="horizon-decision" aria-labelledby="decision-title"><p class="hz-label">Think 10×. Start with 90 days.</p><h3 id="decision-title">{brief.question}</h3><div class="hz-next-move"><span aria-hidden="true">90</span><div><h4>Your next 90 days</h4><p>{brief.moves.pragmatic}</p></div></div><p class="hz-measure"><strong>Know if it works</strong>{brief.measure}</p></aside>
    </div>
    <section class="hz-evidence" id="horizon-evidence" aria-labelledby="evidence-title"><div class="hz-section-heading"><div><p class="hz-label">The evidence behind our call</p><h2 id="evidence-title">{selected.title}: what we know.</h2></div><p>Reviewed {formatClockDate(selected.reviewed_at)}</p></div><p class="hz-assessment">These sources inform our judgement. They do not establish the forecast year. We explain what each supports and what it leaves unanswered.</p><Sources evidence={selected.evidence} /></section>
    <section class="hz-clock-history" id="horizon-prediction-history" aria-labelledby="history-title"><div class="hz-section-heading"><div><p class="hz-label">Accountable to our earlier calls</p><h2 id="history-title">Prediction history.</h2></div><p>{selected.title}</p></div><p class="hz-history-intro">Every published prediction stays in the record, including its original date, milestone and evidence. A revision adds a new entry.</p>{[...entries].reverse().map(entry => <details class="hz-history-entry" key={`${selected.id}-${entry.id}`}><summary><time dateTime={entry.date}>{formatClockDate(entry.date)}</time><span class="hz-history-movement">{entry.movement.label}</span><span class="hz-history-window">By end of {year(entry.record.target_date)}</span><span class="hz-history-open"><span>Read ↓</span><span>Close ↑</span></span></summary><div class="hz-history-body"><p>{entry.reason}</p><p><strong>Our prediction: </strong>{entry.record.milestone}</p><p><strong>Deadline: </strong>{formatClockDate(entry.record.target_date)}</p><p><strong>What would count</strong></p><ol class="hz-resolution-list">{entry.record.resolution.map((item: string) => <li key={item}>{item}</li>)}</ol><p><strong>Why this year: </strong>{entry.record.rationale}</p><p><strong>Uncertainty: </strong>{entry.record.uncertainty}</p><p><strong>Earlier: </strong>{entry.record.earlier}</p><p><strong>Later: </strong>{entry.record.later}</p><Sources evidence={entry.record.evidence} /></div></details>)}</section>
    <span class="sr-only" role="status">{announcement}</span>
    <noscript><p class="hz-noscript">The five predictions above are a published snapshot. Enable JavaScript to switch the detailed view and run the clocks, or <a href="/llms-full.txt">read every prediction and its resolution criteria in the text edition</a>.</p></noscript>
  </div>;
}
