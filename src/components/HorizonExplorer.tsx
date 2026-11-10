import { useEffect, useRef, useState } from 'preact/hooks';
import { FUTURES, STANCES, horizonSearch, markPosition, parseTimeframe, readHorizonState, timelineDomain } from '../lib/horizon-explorer.mjs';
import { CLOCK_REFRESH_MS, clockHistory, validateClockPayload } from '../lib/horizon-clocks.mjs';
import { EDUCATION_PRAGMATIC_SCOPE, horizonBriefing } from '../lib/horizon-briefing.mjs';
import HorizonClocks from './HorizonClocks';
import HorizonClockHistory from './HorizonClockHistory';
import type { ClockData, Stance } from '../lib/horizon-types';

type Props = { initialData: ClockData; initialNow: number };
const titleCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const dateLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function HorizonExplorer({ initialData, initialNow }: Props) {
  const [data, setData] = useState(initialData);
  const currentData = useRef(initialData);
  const { scenarios, review, history, briefs } = data;
  const referenceYear = new Date(initialNow).getUTCFullYear();
  const [state, setState] = useState({ future: 'agents', view: 'pragmatic' });
  const [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [copyState, setCopyState] = useState('');
  const [shareFallback, setShareFallback] = useState('');
  const [briefingFallback, setBriefingFallback] = useState('');
  const copyRequest = useRef(0);
  const [refreshState, setRefreshState] = useState('');
  const checkReview = useRef<() => void>(() => {});
  const ordered = FUTURES.map(future => ({ ...future, scenario: scenarios.find(s => s.id === future.id)!, record: review.futures.find(s => s.id === future.id)! }));
  const selected = ordered.find(s => s.key === state.future)!;
  const stance = state.view as Stance;
  const branch = selected.scenario[stance];
  const brief = briefs.find(item => item.id === selected.id)!;
  const reviewedAt = clockHistory(history, selected.id, stance).at(-1)!.date;
  const domain = timelineDomain(scenarios, referenceYear);

  useEffect(() => {
    const restore = () => { setState(readHorizonState(window.location.search)); clearCopy(); };
    restore();
    setReady(true);
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    let stopped = false;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (stopped || controller || document.visibilityState === 'hidden') return;
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      setRefreshState('Checking published reviews…');
      try {
        const response = await fetch('/horizon/clock-data.json', { cache: 'no-cache', signal: controller.signal });
        if (!response.ok) throw new Error('Review unavailable');
        const next: ClockData = await response.json();
        if (validateClockPayload(next, currentData.current.history).length) throw new Error('Review could not be verified');
        if (stopped) return;
        if (next.revision !== currentData.current.revision) {
          currentData.current = next;
          setData(next);
          clearCopy();
          setAnnouncement('Published Horizon data updated. Your selected future and outlook are preserved.');
          setRefreshState('Published data updated');
        } else setRefreshState('Published reviews checked');
      } catch {
        if (!stopped) setRefreshState('Update check unavailable. Showing the last verified review.');
      } finally { clearTimeout(timeout); controller = undefined; }
    };
    checkReview.current = refresh;
    refresh();
    const timer = setInterval(refresh, CLOCK_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => { stopped = true; clearInterval(timer); controller?.abort(); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  function clearCopy() {
    copyRequest.current += 1;
    setCopyState('');
    setShareFallback('');
    setBriefingFallback('');
  }

  function choose(next: typeof state) {
    if (state.future === next.future && state.view === next.view) return;
    setState(next);
    clearCopy();
    const name = ordered.find(s => s.key === next.future)!.record.title;
    setAnnouncement(`${titleCase(next.view)} scenario for ${name}. The decision brief, details, evidence and clock history are updated below.`);
    const url = `${window.location.pathname}${horizonSearch(window.location.search, next)}${window.location.hash}`;
    window.history.pushState(null, '', url);
  }

  async function copyText(value: string, kind: 'link' | 'briefing') {
    clearCopy();
    const request = copyRequest.current;
    try {
      await navigator.clipboard.writeText(value);
      if (request !== copyRequest.current) return;
      setCopyState(kind === 'link' ? 'Link copied' : 'Briefing copied with sources');
    } catch {
      if (request !== copyRequest.current) return;
      setCopyState(kind === 'link' ? 'Copy the link below' : 'Select and copy the briefing below');
      if (kind === 'link') setShareFallback(value);
      else setBriefingFallback(value);
    }
  }

  function copyView() {
    const url = new URL(window.location.href);
    url.search = horizonSearch(url.search, state);
    url.hash = '';
    return copyText(url.href, 'link');
  }

  return <div class="hz-explorer" id="outlook">
    <div class="hz-toolbar">
      <div><h2>Five futures. Five clocks.</h2><p>Choose a future. Change the outlook. Prepare your next move.</p></div>
      <div class="hz-switch" role="group" aria-label="Scenario outlook">
        {STANCES.map(view => <button type="button" disabled={!ready} aria-pressed={state.view === view} onClick={() => choose({ ...state, view })}>{titleCase(view)}</button>)}
      </div>
    </div>
    <HorizonClocks data={data} stance={stance} selected={state.future} ready={ready} initialNow={initialNow} onSelect={future => choose({ ...state, future })} />
    <div class="hz-refresh"><p role="status">{refreshState || 'Published evidence reviews refresh while this page is open.'}</p><button type="button" disabled={!ready || refreshState === 'Checking published reviews…'} onClick={() => checkReview.current()}>Check for a new review</button></div>
    <div class="hz-workspace">
      <section class="hz-map" aria-label={`${selected.record.title} decision brief and comparison`}>
        <div class="hz-decision" id="horizon-decision">
          <p class="hz-label">The CEO question · {selected.record.title}</p><h3>{brief.question}</h3>
          <p class="hz-tenfold">Use 10× as a design challenge. Measure the gain before claiming it.</p>
          <div class="hz-next-move"><span aria-hidden="true">90</span><div><h4>Your next 90 days · {titleCase(stance)}</h4><p>{brief.moves[stance]}</p></div></div>
          <p class="hz-measure"><strong>Know if it works</strong>{brief.measure}</p>
        </div>
        <details class="hz-timeline"><summary>Compare on the timeline <span aria-hidden="true">+</span></summary>
        <div class="hz-axis" aria-hidden="true"><span>{stance === 'sceptical' ? 'Open-ended outlooks' : 'Calendar year'}</span><div class="hz-ticks" style={{ visibility: stance === 'sceptical' ? 'hidden' : undefined }}>{domain.ticks.map((year, i) => <span style={{ left: `${i * 100 / 3}%` }}>{year === referenceYear ? `NOW · ${year}` : year}</span>)}</div></div>
        <div class="hz-rows" role="group" aria-label="Select a future">
          {ordered.map(({ key, record, scenario }, index) => {
            const mark = parseTimeframe(scenario[stance].timeframe);
            const pos = markPosition(mark, domain);
            return <button type="button" disabled={!ready} class="hz-row" aria-pressed={state.future === key} aria-controls="horizon-detail horizon-evidence" aria-label={`${record.title}, ${titleCase(stance)}: ${mark.label}. Show details.`} onClick={() => choose({ ...state, future: key })}>
              <span class="hz-row-label"><span class="hz-row-number" aria-hidden="true">0{index + 1}</span><span><span class="hz-row-title">{record.title}</span><span class="hz-row-sub">{record.subtitle}</span></span></span>
              <span class={`hz-track ${mark.kind === 'open' ? 'hz-open-track' : ''}`} aria-hidden="true">
                {pos ? <>
                  <span class="hz-mark-label" style={{ left: `${Math.max(18, Math.min(82, pos.centre))}%` }}>{mark.label}</span>
                  {mark.kind === 'by' ? <span class="hz-by" style={{ left: `${pos.left}%` }} /> : <span class="hz-range" style={{ left: `${pos.left}%`, width: `${pos.width}%` }} />}
                </> : <span class="hz-open-date">{mark.label}<span aria-hidden="true"> ↗</span></span>}
              </span>
            </button>;
          })}
        </div>
        <p class="hz-legend">{stance === 'pragmatic' ? 'Bars show the stated date windows.' : stance === 'optimistic' ? 'Diamonds mark “by” dates, not exact arrival predictions.' : 'Open-ended claims keep their wording. No precise year is implied.'} Editorial scenarios, not probabilities. <a href="#method">Date assumptions from {dateLabel(review.dates_origin)}.</a></p>
        </details>
        <div class="hz-watch"><p class="hz-label">What to watch · {selected.record.title}</p><p>{selected.record.watch}</p><a href="#horizon-evidence">Explore the evidence <span aria-hidden="true">↓</span></a></div>
        <div class="hz-map-actions"><a href="#horizon-detail" class="hz-mobile-detail">Read this future ↓</a><button type="button" class="hz-text-button" disabled={!ready} onClick={copyView}>Copy this view <span aria-hidden="true">↗</span></button><button type="button" class="hz-text-button" disabled={!ready} onClick={() => copyText(horizonBriefing(data, state), 'briefing')}>Copy briefing</button><span role="status" class="hz-copy-status">{copyState}</span></div>
        {shareFallback && <label class="hz-share-fallback">Link to this view<input readOnly value={shareFallback} onFocus={event => event.currentTarget.select()} /></label>}
        {briefingFallback && <label class="hz-share-fallback">Briefing with sources<textarea readOnly rows={12} value={briefingFallback} onFocus={event => event.currentTarget.select()} /></label>}
      </section>

      <aside class="hz-detail" id="horizon-detail" aria-labelledby="horizon-detail-title">
        <p class="hz-label">{titleCase(stance)} scenario</p><h3 id="horizon-detail-title">{selected.record.title}</h3>
        <p class="hz-definition">{selected.scenario.definition}</p>
        {state.future === 'education' && stance === 'pragmatic' && <p class="hz-scope-note"><strong>Scope of this view</strong>{EDUCATION_PRAGMATIC_SCOPE}</p>}
        <dl class="hz-brief">
          <div><dt>What this assumes</dt><dd>{branch.assumptions}</dd></div>
          <div><dt>What could change this view</dt><dd>{branch.blockers}</dd></div>
          <div><dt>What this means</dt><dd>{branch.implication}</dd></div>
        </dl>
        <dl class="hz-date-comparison" aria-label="All three date claims">{STANCES.map(view => <div class={view === stance ? 'is-current' : ''}><dt>{titleCase(view)}</dt><dd>{parseTimeframe(selected.scenario[view as Stance].timeframe).label}</dd></div>)}</dl>
      </aside>
    </div>

    <section class="hz-evidence" id="horizon-evidence" aria-labelledby="horizon-evidence-title">
      <div class="hz-section-heading"><div><p class="hz-label">The evidence behind the question</p><h2 id="horizon-evidence-title">{selected.record.question}</h2></div><p>Sources checked <time dateTime={reviewedAt}>{dateLabel(reviewedAt)}</time></p></div>
      <p class="hz-assessment"><strong>Our assessment.</strong> {selected.record.assessment}</p>
      <div class="hz-source-grid">{selected.record.evidence.map((source, i) => <article class="hz-source" key={source.url}>
        <p class="hz-source-date">0{i + 1} / {source.date_label}</p><h3><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <span aria-hidden="true">↗</span></a></h3>
        <p>{source.finding}</p><p class="hz-source-limit"><strong>The limit</strong>{source.limit}</p>
      </article>)}</div>
      {state.future === 'agi' && <a class="hz-inline-link" href="#agi-question">Explore the different definitions of AGI ↓</a>}
    </section>
    <HorizonClockHistory history={history} id={selected.id} title={selected.record.title} stance={stance} />
    <p class="sr-only" aria-live="polite">{announcement}</p>
    <noscript><p class="hz-noscript">The clocks are a dated snapshot until JavaScript is available. The default outlook is shown above. <a href="/horizon/record#compare">Read all three views and all five definitions without JavaScript →</a></p></noscript>
  </div>;
}
