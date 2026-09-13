import { useEffect, useState } from 'preact/hooks';
import { FUTURES, STANCES, horizonSearch, markPosition, parseTimeframe, readHorizonState, timelineDomain } from '../lib/horizon-explorer.mjs';
import type reviewData from '../data/horizon/outlook-review.json';

type Stance = 'optimistic' | 'pragmatic' | 'sceptical';
type Branch = { timeframe: string; assumptions: string; blockers: string; implication: string };
type Scenario = { id: string; definition: string; optimistic: Branch; pragmatic: Branch; sceptical: Branch };
type Props = { scenarios: Scenario[]; review: typeof reviewData; referenceYear: number };
const titleCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const dateLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function HorizonExplorer({ scenarios, review, referenceYear }: Props) {
  const [state, setState] = useState({ future: 'agents', view: 'pragmatic' });
  const [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [copyState, setCopyState] = useState('');
  const [shareFallback, setShareFallback] = useState('');
  const ordered = FUTURES.map(future => ({ ...future, scenario: scenarios.find(s => s.id === future.id)!, record: review.futures.find(s => s.id === future.id)! }));
  const selected = ordered.find(s => s.key === state.future)!;
  const stance = state.view as Stance;
  const branch = selected.scenario[stance];
  const domain = timelineDomain(scenarios, referenceYear);

  useEffect(() => {
    const restore = () => { setState(readHorizonState(window.location.search)); setCopyState(''); setShareFallback(''); };
    restore();
    setReady(true);
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  function choose(next: typeof state) {
    if (state.future === next.future && state.view === next.view) return;
    setState(next);
    setCopyState('');
    setShareFallback('');
    const name = ordered.find(s => s.key === next.future)!.record.title;
    setAnnouncement(`${titleCase(next.view)} scenario for ${name}. Details and evidence updated below the map.`);
    const url = `${window.location.pathname}${horizonSearch(window.location.search, next)}${window.location.hash}`;
    window.history.pushState(null, '', url);
  }

  async function copyView() {
    const url = new URL(window.location.href);
    url.search = horizonSearch(url.search, state);
    url.hash = '';
    try {
      await navigator.clipboard.writeText(url.href);
      setCopyState('Link copied');
      setShareFallback('');
    } catch {
      setCopyState('Copy the link below');
      setShareFallback(url.href);
    }
  }

  return <div class="hz-explorer" id="outlook">
    <div class="hz-toolbar">
      <div><h2>Five possible futures</h2><p>Choose a future. Compare the outlook.</p></div>
      <div class="hz-switch" role="group" aria-label="Scenario outlook">
        {STANCES.map(view => <button type="button" disabled={!ready} aria-pressed={state.view === view} onClick={() => choose({ ...state, view })}>{titleCase(view)}</button>)}
      </div>
    </div>
    <div class="hz-workspace">
      <section class="hz-map" aria-label={`${titleCase(stance)} scenario date comparison`}>
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
        <div class="hz-watch"><p class="hz-label">What to watch · {selected.record.title}</p><p>{selected.record.watch}</p><a href="#horizon-evidence">Explore the evidence <span aria-hidden="true">↓</span></a></div>
        <div class="hz-map-actions"><a href="#horizon-detail" class="hz-mobile-detail">Read this future ↓</a><button type="button" class="hz-text-button" disabled={!ready} onClick={copyView}>Copy this view <span aria-hidden="true">↗</span></button><span role="status" class="hz-copy-status">{copyState}</span></div>
        {shareFallback && <label class="hz-share-fallback">Link to this view<input readOnly value={shareFallback} onFocus={event => event.currentTarget.select()} /></label>}
      </section>

      <aside class="hz-detail" id="horizon-detail" aria-labelledby="horizon-detail-title">
        <p class="hz-label">{titleCase(stance)} scenario</p><h3 id="horizon-detail-title">{selected.record.title}</h3>
        <p class="hz-definition">{selected.scenario.definition}</p>
        {state.future === 'education' && stance === 'pragmatic' && <p class="hz-scope-note"><strong>Scope of this view</strong>Partial change within existing institutions. This date window does not describe the full replacement threshold above.</p>}
        <dl class="hz-brief">
          <div><dt>What this assumes</dt><dd>{branch.assumptions}</dd></div>
          <div><dt>What could change this view</dt><dd>{branch.blockers}</dd></div>
          <div><dt>What this means</dt><dd>{branch.implication}</dd></div>
        </dl>
        <dl class="hz-date-comparison" aria-label="All three date claims">{STANCES.map(view => <div class={view === stance ? 'is-current' : ''}><dt>{titleCase(view)}</dt><dd>{parseTimeframe(selected.scenario[view as Stance].timeframe).label}</dd></div>)}</dl>
      </aside>
    </div>

    <section class="hz-evidence" id="horizon-evidence" aria-labelledby="horizon-evidence-title">
      <div class="hz-section-heading"><div><p class="hz-label">The evidence behind the question</p><h2 id="horizon-evidence-title">{selected.record.question}</h2></div><p>Sources checked <time dateTime={review.reviewed_at}>{dateLabel(review.reviewed_at)}</time></p></div>
      <p class="hz-assessment"><strong>Our assessment.</strong> {selected.record.assessment}</p>
      <div class="hz-source-grid">{selected.record.evidence.map((source, i) => <article class="hz-source" key={source.url}>
        <p class="hz-source-date">0{i + 1} / {source.date_label}</p><h3><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} <span aria-hidden="true">↗</span></a></h3>
        <p>{source.finding}</p><p class="hz-source-limit"><strong>The limit</strong>{source.limit}</p>
      </article>)}</div>
      {state.future === 'agi' && <a class="hz-inline-link" href="#agi-question">Explore the different definitions of AGI ↓</a>}
    </section>
    <p class="sr-only" aria-live="polite">{announcement}</p>
    <noscript><p class="hz-noscript">The default outlook is shown above. <a href="/horizon/record#compare">Read all three views and all five definitions without JavaScript →</a></p></noscript>
  </div>;
}
