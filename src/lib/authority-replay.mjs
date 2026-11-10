/** A reading layer over an immutable execution receipt. This executes no research. */
export const replayScenarios = [
  { id: 'revoked_inflight', label: 'Permission withdrawn', question: 'The request is ready. Then permission changes.', context: 'A specialist has prepared task A. An administrator withdraws its permission before the specialist tries to commit. A separate task B still has permission.', takeaway: 'A stop should apply to the revoked task. It should also leave separately authorised work possible.' },
  { id: 'authorised', label: 'Permission holds', question: 'Can the permitted task actually finish?', context: 'The specialist is allowed to add one synthetic remediation request to the local queue. Preparing a request and committing it are separate steps.', takeaway: 'A useful boundary must let authorised work complete as well as refuse forbidden work.' },
  { id: 'identical_retry', label: 'The request repeats', question: 'Two attempts. How many effects?', context: 'The same specialist submits the same task, request key and payload twice. A retry must not quietly create a second action.', takeaway: 'Count durable effects, not success messages. A repeated receipt can refer to the original action.' },
  { id: 'lost_reply_restart', label: 'The reply disappears', question: 'No reply. Did the action happen?', context: 'The service exits after committing the action but before replying. It then restarts. The caller must find out what happened before claiming an outcome.', takeaway: 'A missing reply does not establish failure. Reconciliation can recover the original outcome.' },
];

// These stories describe these registered recordings. A changed recording needs
// editorial review, rather than silently inheriting the old explanation.
const storyContract = {
  revoked_inflight: ['begin:PENDING:A', 'revoke:REVOKED:A', 'commit:DENIED:A:REVOKED', 'lookup:ABSENT:A', 'begin:PENDING:B', 'commit:COMMITTED:B'],
  authorised: ['begin:PENDING:A', 'commit:COMMITTED:A'],
  identical_retry: ['begin:PENDING:A', 'commit:COMMITTED:A', 'begin:PENDING:A', 'commit:REPLAY:A'],
  lost_reply_restart: ['begin:PENDING:A', 'commit:NO_RESPONSE:A', 'lookup:FOUND:A'],
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const assert = (condition, message) => { if (!condition) throw new Error(`Replay evidence unavailable: ${message}`); };
const words = { PENDING: 'Prepared, not committed', COMMITTED: 'Action committed', DENIED: 'Permission refused', REPLAY: 'Original receipt returned', FOUND: 'Original action found', ABSENT: 'No action found', REVOKED: 'Permission withdrawn', NO_RESPONSE: 'Outcome unknown to caller' };

function describe(status, job, reason) {
  if (status === 'PENDING') return `This task ${job} request is prepared but not yet committed. Preparing it adds no queue effect.`;
  if (status === 'COMMITTED') return `The service checked current authority and committed task ${job} to the synthetic queue.`;
  if (status === 'REVOKED') return `The administrator revoked task ${job}. A prepared request does not keep its old permission.`;
  if (status === 'DENIED') return reason === 'REVOKED' ? `Task ${job} was refused because its permission had been withdrawn.` : `Task ${job} was refused because the requested resource is outside its grant.`;
  if (status === 'REPLAY') return `The service returned task ${job}'s original receipt. This response did not add another effect.`;
  if (status === 'FOUND') return `After restart, a permitted lookup found task ${job}'s durable receipt. The caller can now reconcile its outcome.`;
  if (status === 'ABSENT') return `A permitted lookup found no committed action for task ${job}.`;
  return 'The service gave no reply. The caller cannot yet tell whether its action committed. The next lookup will check.';
}

export function buildAuthorityReplay(receipt) {
  assert(receipt?.schemaVersion === 1 && receipt.stage === 'authenticated-action-boundary', 'unsupported receipt schema');
  assert(typeof receipt.generatedAt === 'string' && Number.isFinite(Date.parse(receipt.generatedAt)), 'missing recording date');
  assert(Array.isArray(receipt.runs), 'missing runs');
  const scenarios = replayScenarios.map(meta => {
    const matches = receipt.runs.filter(run => run.id === meta.id);
    assert(matches.length === 1, `${meta.id} is missing or duplicated`);
    const run = matches[0];
    const trace = run.trace;
    assert(trace?.id === meta.id && trace.scenario === meta.id && trace.error === null, `${meta.id} trace incomplete`);
    assert(run.grade?.passed === true && Array.isArray(run.grade.errors) && run.grade.errors.length === 0, `${meta.id} has no passing source grade`);
    assert(Array.isArray(trace.calls) && trace.calls.length > 0 && Array.isArray(trace.snapshot?.events) && Array.isArray(trace.snapshot?.queue), `${meta.id} has no complete snapshot`);
    const events = trace.snapshot.events;
    assert(events.length === trace.calls.length, `${meta.id} call/event count differs`);
    const queue = trace.snapshot.queue;
    const requests = new Map();
    const effects = new Map();
    let previousSeq = 0;
    const frames = trace.calls.map((call, index) => {
      const event = events[index];
      assert(Number.isInteger(event.seq) && event.seq > previousSeq, `${meta.id} event ordering changed`);
      previousSeq = event.seq;
      assert(call.request?.op === call.operation && ['begin', 'commit', 'lookup', 'revoke'].includes(call.operation), `${meta.id} unknown operation`);
      assert(call.client === (call.operation === 'revoke' ? 'admin' : 'specialist'), `${meta.id} caller changed`);
      if (call.operation === 'begin' && call.response?.request_id) requests.set(call.response.request_id, call.request.job);
      const job = call.request.job || requests.get(call.request.request_id);
      assert(['A', 'B'].includes(job) && event.job === job, `${meta.id} task identity mismatch`);
      let status;
      if (call.error === 'NO_RESPONSE') {
        assert(meta.id === 'lost_reply_restart' && call.response === null && call.operation === 'commit' && event.kind === 'commit' && event.status === 'COMMITTED' && event.request_id === call.request.request_id, 'lost response lacks its recorded commit');
        status = 'NO_RESPONSE';
      } else {
        assert(call.error === null && call.response && (call.response.event_seq ?? call.response.seq) === event.seq, `${meta.id} response ordering differs`);
        status = call.operation === 'revoke' && call.response.kind === 'revoke' ? 'REVOKED' : call.response.status;
        assert(Object.hasOwn(words, status) && status !== 'NO_RESPONSE', `${meta.id} unknown response status`);
        const kinds = { PENDING: 'begin', COMMITTED: 'commit', REPLAY: 'replay', FOUND: 'lookup', ABSENT: 'lookup', DENIED: 'deny', REVOKED: 'revoke' };
        assert(event.kind === kinds[status], `${meta.id} response/event disagreement`);
        assert(status === 'DENIED' || status === 'REVOKED' || event.status === status, `${meta.id} event status differs`);
        if (status === 'DENIED') assert(['REVOKED', 'SCOPE_MISMATCH'].includes(call.response.reason) && event.reason === call.response.reason, `${meta.id} unknown denial`);
        if (call.response.receipt) assert(same(call.response.receipt, event.receipt), `${meta.id} response receipt differs`);
      }
      if (event.kind === 'commit') {
        assert(event.receipt?.action_id && event.receipt.commit_seq === event.seq && event.receipt.job === job && !effects.has(event.receipt.action_id), `${meta.id} invalid committed effect`);
        effects.set(event.receipt.action_id, event.receipt);
      }
      if (['replay', 'lookup'].includes(event.kind) && event.receipt) assert(same(effects.get(event.receipt.action_id), event.receipt), `${meta.id} unknown recovered receipt`);
      const knownQueue = status === 'NO_RESPONSE' ? null : [...effects.values()];
      return { index: index + 1, status, title: words[status], description: describe(status, job, call.response?.reason), job, client: call.client, operation: call.operation, seq: event.seq, reason: call.response?.reason || null, queue: knownQueue, receipt: call.response?.receipt || null, call, event };
    });
    assert(same(frames.map(frame => `${frame.operation}:${frame.status}:${frame.job}${frame.reason ? `:${frame.reason}` : ''}`), storyContract[meta.id]), `${meta.id} recording changed and its story needs review`);
    assert(same([...effects.values()], queue), `${meta.id} final queue does not match committed events`);
    if (meta.id === 'lost_reply_restart') assert(same(trace.process_exits, [74, 0]) && trace.observations?.[0]?.status === 'outcome_unknown' && trace.observations?.[1]?.status === 'reconciled' && same(trace.observations[1].receipt, queue[0]), 'lost-response reconciliation changed');
    const jobs = queue.map(effect => effect.job);
    return { ...meta, frames, queue, verdict: `${queue.length} recorded queue ${queue.length === 1 ? 'effect' : 'effects'}${jobs.length ? ` · task ${jobs.join(', ')}` : ''}`, raw: run };
  });
  return { recordedAt: receipt.generatedAt, scenarios };
}

export function replayFrame(scenario, position) {
  assert(scenario?.frames?.length > 0, 'no frames to read');
  const index = Number.isFinite(position) ? Math.max(0, Math.min(scenario.frames.length, Math.floor(position))) : 0;
  return index === 0 ? null : scenario.frames[index - 1];
}
