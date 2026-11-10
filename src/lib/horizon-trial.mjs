import { FUTURES } from './horizon-explorer.mjs';

export const TRIAL_FIELDS = ['task', 'owner', 'baseline', 'success', 'stop'];
export const TRIAL_FIELD_LIMIT = 2000;

export function emptyTrialDraft() {
  return Object.fromEntries(TRIAL_FIELDS.map(field => [field, '']));
}

export function updateTrialDraft(drafts, id, field, value) {
  if (!FUTURES.some(future => future.id === id) || !TRIAL_FIELDS.includes(field) || typeof value !== 'string') {
    throw new Error('A trial edit needs a known prediction and field.');
  }
  return {
    ...drafts,
    [id]: { ...emptyTrialDraft(), ...drafts[id], [field]: value.slice(0, TRIAL_FIELD_LIMIT) },
  };
}

export function trialBrief(record, brief, draft) {
  const future = FUTURES.find(future => future.id === record?.id);
  if (!future || brief?.id !== record.id) throw new Error('The trial needs its matching prediction and planning advice.');
  const answer = field => typeof draft?.[field] === 'string' && draft[field].trim() ? draft[field].trim() : '[To decide]';
  const evidence = record.evidence.map((source, index) => [
    `${index + 1}. ${source.title} (${source.date_label})`, source.url,
    `Finding: ${source.finding}`, `Limit: ${source.limit}`,
  ].join('\n')).join('\n\n');
  return [
    `SOFT CAT .ai / Your 90-day trial brief\n${record.title}`,
    'A visitor-written plan, not a completed trial or evidence for our forecast. Unfilled fields are marked [To decide]. Choose a start date with your team. The 90 days are a planning horizon, separate from our prediction deadline.',
    `01 / Define a bounded trial\nTask and boundary\n${answer('task')}\n\nAccountable owner\n${answer('owner')}`,
    `02 / Establish the baseline\nCurrent result and how we measure it\n${answer('baseline')}`,
    `03 / Agree decision rules before starting\nSuccess threshold\n${answer('success')}\n\nStop or recovery rule\n${answer('stop')}`,
    `Suggested sequence\nDays 1–30: record the current process and agree the boundaries, success threshold and stop rule before testing.\nDays 31–60: run a supervised comparison, retaining failures and interventions.\nDays 61–90: compare outcomes with the baseline, then decide whether to change, stop or extend the trial.`,
    `A question to test\n${brief.question}`,
    `Our suggested starting point\n${brief.moves.pragmatic}`,
    `What to measure\n${brief.measure}`,
    `Forecast context, not a trial result\nOur prediction: ${record.milestone}\nPrediction deadline: ${record.target_date} (inclusive, UTC)\nEvidence reviewed: ${record.reviewed_at}\nReview record: ${record.event_id}`,
    `Our forecast's resolution criteria\n${record.resolution.map(item => `• ${item}`).join('\n')}`,
    `Forecast uncertainty\n${record.uncertainty}`,
    `Primary evidence and its limits\n\n${evidence}`,
    `Selected prediction\nhttps://softcat.ai/horizon/?future=${future.key}#horizon-decision`,
  ].join('\n\n');
}
