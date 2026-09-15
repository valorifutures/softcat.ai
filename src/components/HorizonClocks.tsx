import { useEffect, useState } from 'preact/hooks';
import { FUTURES } from '../lib/horizon-explorer.mjs';
import { clockCaption, clockHistory, formatClockDate, scenarioClock } from '../lib/horizon-clocks.mjs';
import type { ClockData, Stance } from '../lib/horizon-types';

type Props = { data: ClockData; stance: Stance; selected: string; ready: boolean; initialNow: number; onSelect: (key: string) => void };
const pad = (value: number) => String(value).padStart(2, '0');

export default function HorizonClocks({ data, stance, selected, ready, initialNow, onSelect }: Props) {
  const [now, setNow] = useState(initialNow);
  const [live, setLive] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      clearInterval(timer);
      if (document.visibilityState === 'hidden' || paused) return;
      setNow(Date.now());
      setLive(true);
      timer = setInterval(() => setNow(Date.now()), 1000);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', sync); };
  }, [paused]);

  return <section class="hz-clocks" aria-label="Five scenario clocks">
    <div class="hz-clocks-heading"><p><span class="hz-clock-dot" aria-hidden="true" />{paused ? 'Clocks paused' : live ? 'Clocks running' : `Snapshot ${formatClockDate(initialNow)}`} · UTC</p><button type="button" disabled={!ready} onClick={() => setPaused(!paused)}>{paused ? 'Resume clocks' : 'Pause clocks'}</button></div>
    <div class="hz-clock-grid" role="group" aria-label="Choose a future clock">
      {FUTURES.map(({ key, id }, index) => {
        const scenario = data.scenarios.find(item => item.id === id)!;
        const outlook = data.review.futures.find(item => item.id === id)!;
        const clock = scenarioClock(scenario[stance].timeframe, now);
        const latest = clockHistory(data.history, id, stance).at(-1)!;
        const dated = clock.target !== null;
        const caption = clockCaption(clock);
        const movement = latest.movement.kind === 'unchanged' ? clock.phase === 'undated' ? 'Still undated' : clock.phase === 'deadline' || clock.label === 'Deadline elapsed' ? 'Deadline unchanged' : 'Window unchanged' : latest.movement.label;
        return <button type="button" key={key} class="hz-clock" disabled={!ready} aria-pressed={selected === key} aria-controls="horizon-decision horizon-detail horizon-evidence horizon-clock-history" aria-label={`${outlook.title}, ${stance}: ${clock.wording}. ${caption.summary}. ${movement}. Reviewed ${formatClockDate(latest.date)}. Explore this future.`} onClick={() => onSelect(key)}>
          <span class="hz-clock-top"><span>0{index + 1}</span><span aria-hidden="true">{selected === key ? 'Selected ↙' : 'Explore ↗'}</span></span>
          <span class="hz-clock-title">{outlook.title}</span>
          <span class={`hz-clock-face ${dated ? '' : 'hz-clock-undated'}`} aria-hidden="true">
            {dated ? <><span class="hz-clock-days">{caption.value}<small>{caption.unit}</small></span><span class="hz-clock-label">{caption.destination}</span><span class="hz-clock-time">{pad(clock.hours!)}<small>h</small><span>:</span>{pad(clock.minutes!)}<small>m</small><span>:</span>{pad(clock.seconds!)}<small>s</small></span></> : <><span>{clock.phase === 'elapsed' ? 'Review due' : 'Open-ended'}</span><span class="hz-clock-label">{clock.label}</span></>}
          </span>
          <span class="hz-clock-window">{clock.wording}</span>
          <span class={`hz-clock-change hz-change-${latest.movement.kind}`}>{movement}<span>Reviewed <time dateTime={latest.date}>{formatClockDate(latest.date)}</time></span></span>
        </button>;
      })}
    </div>
    <p class="hz-clock-note"><strong>Time counts down. Evidence can move the target.</strong> Days remaining to each editorial scenario’s boundary, not a promised arrival date. {stance === 'sceptical' ? 'These outlooks name no precise boundary, so there is no numeric countdown.' : 'A range counts to its opening year, then the end of its final year. “By” includes the final year.'} <a href="#method">How the clocks work ↓</a></p>
  </section>;
}
