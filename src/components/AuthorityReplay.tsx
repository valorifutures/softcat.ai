import { useEffect, useState } from 'preact/hooks';
import { replayFrame } from '../lib/authority-replay.mjs';
import '../styles/authority-replay.css';

type Effect = { action_id: string; job: string; commit_seq: number };
type Frame = { index: number; status: string; title: string; description: string; client: string; job: string; operation: string; seq: number; reason: string | null; queue: Effect[] | null; receipt: Effect | null; call: unknown; event: unknown };
type Scenario = { id: string; label: string; question: string; context: string; takeaway: string; frames: Frame[]; queue: Effect[]; verdict: string };
type Props = { scenarios: Scenario[] };

export default function AuthorityReplay({ scenarios }: Props) {
  const [selected, setSelected] = useState(0);
  const [position, setPosition] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const scenario = scenarios[selected];
  const frame = replayFrame(scenario, position) as Frame | null;
  const finished = position === scenario.frames.length;
  const tone = frame?.status === 'DENIED' || frame?.status === 'REVOKED' ? 'stopped' : frame?.status === 'NO_RESPONSE' ? 'unknown' : 'ordinary';
  const queue = frame ? frame.queue : [];
  function choose(index: number) { setSelected(index); setPosition(0); }

  return <section class="authority-replay" aria-label="Recorded authority replay">
    <div class="ar-pick">
      <div class="ar-pick-heading"><span class="ar-kicker">01 / Choose a situation</span><span>Four real recordings. No live calls.</span></div>
      <div class="ar-scenarios" role="group" aria-label="Recorded situations">
        {scenarios.map((item, index) => <button type="button" aria-pressed={index === selected} disabled={!ready} onClick={() => choose(index)}><span class="ar-scenario-number">0{index + 1}</span>{item.label}</button>)}
      </div>
    </div>
    <div class="ar-board" data-tone={tone}>
      <header class="ar-board-header"><div><p class="ar-kicker">02 / Read what happened</p><h2>{scenario.question}</h2><p>{scenario.context}</p></div><span class="ar-recording"><span aria-hidden="true">●</span> Recorded replay</span></header>
      <div class="ar-flow" aria-label="Caller, permission decision and observed effect">
        <div class={`ar-node ar-caller ${frame ? 'ar-active' : ''}`}><p class="ar-node-label">The caller</p><span class="ar-node-symbol" aria-hidden="true">↗</span><h3>{frame?.client === 'admin' ? 'Administrator' : 'Specialist'}</h3><p>{frame ? `Task ${frame.job} · ${frame.operation === 'begin' ? 'prepare request' : frame.operation === 'commit' ? 'try to commit' : frame.operation === 'lookup' ? 'check the outcome' : 'withdraw permission'}` : 'A scripted client with a verified identity.'}</p><span class="ar-small-tag">{frame ? 'Recorded request' : 'Ready to read'}</span></div>
        <div class={`ar-node ar-decision ${frame ? 'ar-active' : ''}`}><p class="ar-node-label">The action service</p><span class="ar-node-symbol" aria-hidden="true">{tone === 'stopped' ? '⊣' : tone === 'unknown' ? '?' : '◇'}</span><h3>{frame ? frame.title : 'Permission is checked here'}</h3><p>{frame ? frame.status === 'NO_RESPONSE' ? 'No reply reached the caller.' : frame.reason ? frame.reason === 'REVOKED' ? 'Task permission was withdrawn.' : 'The requested resource is outside scope.' : frame.status === 'REVOKED' ? 'The administrative change is recorded.' : 'The service returned this recorded decision.' : 'The caller cannot grant itself permission.'}</p><span class="ar-small-tag">{frame ? frame.status === 'NO_RESPONSE' ? 'Caller: unknown' : `Response: ${frame.status}` : 'Separate local process'}</span></div>
        <div class={`ar-node ar-effect ${frame?.receipt ? 'ar-active' : ''}`}><p class="ar-node-label">The synthetic queue</p><span class="ar-effect-count">{queue === null ? '?' : queue.length}</span><h3>{queue === null ? 'Not yet reconciled' : `${queue.length === 1 ? 'Effect' : 'Effects'} confirmed so far`}</h3><p>{queue === null ? 'Do not infer failure or success from silence.' : queue.length ? queue.map(effect => `Task ${effect.job}`).join(' · ') + ' is in the durable record.' : 'A prepared request is not a committed action.'}</p><span class="ar-small-tag">{queue === null ? 'Next: inspect the receipt' : 'Local test data only'}</span></div>
      </div>
      <div class="ar-event" aria-live="polite" aria-atomic="true"><span class="ar-event-number">{String(position).padStart(2, '0')}<small> / {String(scenario.frames.length).padStart(2, '0')}</small></span><div><h3>{frame ? frame.title : 'What do you think will happen?'}</h3><p>{frame ? frame.description : 'Step through the original recording. Watch what the caller learns and what the service actually commits.'}</p></div></div>
      <div class="ar-controls"><div><button type="button" disabled={!ready || position === 0} onClick={() => setPosition(position - 1)} aria-label="Previous recorded step">← Previous</button><button class="ar-next" type="button" disabled={!ready || finished} onClick={() => setPosition(position + 1)}>{position === 0 ? 'Reveal the first step' : finished ? 'Recording complete' : 'Next recorded step'} <span aria-hidden="true">→</span></button></div><button class="ar-restart" type="button" disabled={!ready || position === 0} onClick={() => setPosition(0)}>Start again</button></div>
      <div class="ar-step-track" aria-label="Recording progress">{scenario.frames.map((step, index) => <span class={index < position ? 'ar-seen' : ''} aria-hidden="true" />)}<span class="ar-sr">{position} of {scenario.frames.length} recorded steps revealed.</span></div>
      <p class="ar-timing">You control the pace. Step numbers follow recorded call order, not elapsed time. Reading this page runs no agent or experiment.</p>
      {finished && <aside class="ar-takeaway"><p class="ar-kicker">The recorded outcome</p><h3>{scenario.verdict}</h3>{scenario.id === 'revoked_inflight' && <p>Task A: {scenario.queue.filter(effect => effect.job === 'A').length} effects. Task B: {scenario.queue.filter(effect => effect.job === 'B').length} effect.</p>}<p>{scenario.takeaway}</p><a href={`#transcript-${scenario.id}`}>Read this case and its complete evidence ↓</a></aside>}
      {frame && <details class="ar-step-evidence" key={`${scenario.id}-${position}`}><summary>Inspect this step's request and recorded evidence</summary><p>Service events come from the final snapshot. They let us inspect the run afterwards. They are not extra messages received by the caller.{frame.status === 'NO_RESPONSE' ? ' Here, the snapshot records a commit even though the caller received no response.' : ''} Event {frame.seq} is a logical database sequence.</p><pre tabIndex={0} aria-label="Recorded request and service event">{JSON.stringify({ call: frame.call, serviceEvent: frame.event }, null, 2)}</pre></details>}
      {!ready && <p class="ar-loading">The full recordings below work without interactive controls. <a href="#transcripts">Read the transcripts ↓</a></p>}
    </div>
  </section>;
}
