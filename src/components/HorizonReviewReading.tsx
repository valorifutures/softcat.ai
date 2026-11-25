import readings from '../data/horizon/review-readings.json';
import { formatClockDate } from '../lib/horizon-clocks.mjs';
import { predictionHistory } from '../lib/horizon-predictions.mjs';
import type { PredictionRecord, ReviewReading } from '../lib/horizon-prediction-types';

type Review = ReturnType<typeof predictionHistory>[number];
const publishedReadings: Record<string, Record<string, ReviewReading>> = readings;

export function reviewReading(eventId: string, record: PredictionRecord) {
  return record.decision || publishedReadings[eventId]?.[record.id];
}

export function ReviewArguments({ reading, record }: { reading?: ReviewReading; record: PredictionRecord }) {
  const sources = reading ? record.evidence.filter(source => reading.source_urls.includes(source.url)) : record.evidence.slice(0, 1);
  return <>
    <dl class="hz-arguments">
      <div><dt>The case for a change</dt><dd>{reading?.case_for_change ?? sources[0].finding}</dd></div>
      <div><dt>The challenge</dt><dd>{reading?.challenge ?? sources[0].limit}</dd></div>
      <div><dt>Our judgement</dt><dd>{reading?.judgement ?? record.rationale}</dd></div>
      <div><dt>What would change our mind?</dt><dd>{reading?.reconsider ?? record.earlier}{!reading && <> {record.later}</>}</dd></div>
    </dl>
    <p class="hz-reading-links">{sources.map(source => <a key={source.url} href={source.url}>{source.title}</a>)}</p>
  </>;
}

export default function HorizonReviewReading({ entry, future, ready }: { entry: Review; future: string; ready: boolean }) {
  const { record, previous, movement } = entry;
  const target = formatClockDate(record.target_date);
  const moved = previous && previous.target_date !== record.target_date;
  const heading = moved ? `We moved the date to ${target}.` : previous ? `We kept ${target}.` : `We chose ${target}.`;
  return <div popover="auto" id={`why-${future}`} class="hz-reading-popover" role="dialog" aria-labelledby={`why-title-${future}`}>
    <div class="hz-reading-top"><p>{record.title} · <time dateTime={entry.date}>{formatClockDate(entry.date)}</time></p>
      <button type="button" popovertarget={`why-${future}`} popovertargetaction="hide" aria-label={`Close date explanation for ${record.title}`}>Close</button></div>
    <h2 id={`why-title-${future}`}>{heading}</h2>
    {moved && <p class="hz-date-change">Previously {formatClockDate(previous.target_date)} · {movement.dateChangeLabel}</p>}
    {movement.kind === 'scope' && <p class="hz-date-change">We also revised the milestone or its test.</p>}
    <ReviewArguments record={record} reading={reviewReading(entry.id, record)} />
    {ready ? <a class="hz-full-record" href={`/horizon/?future=${future}#horizon-prediction-history`} onClick={event => event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()}>Read the full review history</a>
      : <a class="hz-full-record" href="/horizon/prediction-data.json">Read all published reviews as data</a>}
  </div>;
}
