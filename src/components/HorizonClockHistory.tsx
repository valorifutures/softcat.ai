import { clockHistory, formatClockDate } from '../lib/horizon-clocks.mjs';
import type { ClockEvent, Stance } from '../lib/horizon-types';

export default function HorizonClockHistory({ history, id, title, stance }: { history: ClockEvent[]; id: string; title: string; stance: Stance }) {
  const entries = clockHistory(history, id, stance).reverse();
  return <section class="hz-clock-history" id="horizon-clock-history" aria-labelledby="horizon-history-title">
    <div class="hz-section-heading"><div><p class="hz-label">A view that can change its mind</p><h2 id="horizon-history-title">What moved the clock?</h2></div><p>{title} · {stance}</p></div>
    <p class="hz-history-intro">Every recorded review, including decisions to keep the same window. Changing the outlook above compares assumptions; it is not an evidence revision.</p>
    <div class="hz-history-entries">{entries.map(entry => <details key={`${id}-${stance}-${entry.id}`} class="hz-history-entry">
      <summary><time dateTime={entry.date}>{formatClockDate(entry.date)}</time><span class="hz-history-movement">{entry.movement.label}</span><span class="hz-history-window">{entry.record.timeframes[stance]}</span><span class="hz-history-open" aria-hidden="true">Read +</span></summary>
      <div class="hz-history-body">
        {entry.previous && <p><strong>Previous wording:</strong> {entry.previous.timeframes[stance]}<br /><strong>Reviewed wording:</strong> {entry.record.timeframes[stance]}</p>}
        <p><strong>Threshold at this review:</strong> {entry.record.definition}</p>
        {entry.record.reason ? <p>{entry.record.reason}</p> : <p>The original scenario wording, preserved before adding the live clocks. This is a dated editorial baseline.</p>}
        {entry.source && <a href={entry.source} target="_blank" rel="noopener noreferrer">Read the preserved baseline ↗</a>}
        {entry.record.evidence && <ul class="hz-history-sources">{entry.record.evidence.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a><span>{source.date_label}</span><p>{source.finding}</p><p><strong>Limit:</strong> {source.limit}</p></li>)}</ul>}
      </div>
    </details>)}</div>
  </section>;
}
