import { FUTURES } from './horizon-explorer.mjs';
import { scenarioClock } from './horizon-clocks.mjs';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const text = value => typeof value === 'string' && value.trim().length > 0;
const realDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const predictionDate = value => realDate(value) && /^[1-9]\d{3}-12-31$/.test(value);
const safeSource = value => {
  if (typeof value !== 'string' || /\s/.test(value)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password; } catch { return false; }
};

// Each future retains its own actual review date when an event updates only one.
export function latestPredictions(history) {
  const latest = new Map();
  for (const event of history) for (const record of event.records) {
    latest.set(record.id, { ...record, reviewed_at: event.date, event_id: event.id, event_reason: event.reason });
  }
  return FUTURES.flatMap(({ id }) => latest.has(id) ? [latest.get(id)] : []);
}

export function predictionMovement(previous, current) {
  if (!previous) return { kind: 'baseline', label: 'First prediction' };
  if (previous.milestone !== current.milestone || !same(previous.resolution, current.resolution)) return { kind: 'scope', label: 'Milestone changed' };
  if (previous.target_date === current.target_date) return { kind: 'unchanged', label: 'Prediction unchanged' };
  return current.target_date < previous.target_date
    ? { kind: 'earlier', label: 'Prediction moved earlier' }
    : { kind: 'later', label: 'Prediction moved later' };
}

export function predictionHistory(history, id) {
  let previous;
  return history.flatMap(event => {
    const record = event.records.find(record => record.id === id);
    if (!record) return [];
    const snapshot = { ...event, record, previous, movement: predictionMovement(previous, record) };
    previous = record;
    return [snapshot];
  });
}

// A year-end editorial forecast is not a prediction of an exact arrival day.
// Reuse the inclusive UTC year boundary, including the whole of 31 December.
export function predictionClock(record, now) {
  const clock = scenarioClock(predictionDate(record?.target_date) ? `by end of ${record.target_date.slice(0, 4)}` : '', now);
  return { ...clock, label: clock.phase === 'deadline' ? 'Our prediction deadline in' : clock.phase === 'elapsed' ? 'Prediction deadline elapsed' : 'No prediction date' };
}

export function predictionCaption(clock) {
  if (clock.target === null) return { summary: clock.phase === 'elapsed' ? 'Review due. Prediction deadline elapsed' : 'No dated prediction' };
  const value = clock.days === 0 ? '<1' : clock.days.toLocaleString('en-GB');
  const unit = clock.days <= 1 ? 'day' : 'days';
  const destination = 'until our prediction deadline';
  return { value, unit, destination, summary: `${clock.days === 0 ? 'Less than 1 day' : `${value} ${unit}`} ${destination}` };
}

export function predictionBriefing(history, id, brief) {
  const future = FUTURES.find(future => future.id === id) ?? FUTURES.find(future => future.key === 'agents');
  const record = latestPredictions(history).find(record => record.id === future.id);
  if (!record || brief?.id !== future.id) throw new Error('The selected prediction needs its matching decision brief.');
  const sources = record.evidence.map((source, index) => [
    `${index + 1}. ${source.title} (${source.date_label})`, source.url,
    `Finding: ${source.finding}`, `The limit: ${source.limit}`,
  ].join('\n')).join('\n\n');
  return [
    `SOFT CAT .ai / Our Horizon prediction\n${record.title}`,
    `We predict this milestone by the end of ${record.target_date.slice(0, 4)}. This is our editorial judgement, not a guarantee or a prediction of an exact arrival day.`,
    `Our prediction\n${record.milestone}`,
    `Prediction deadline: ${record.target_date} (end of year, UTC)\nReviewed: ${record.reviewed_at}`,
    `What would count\n${record.resolution.map(item => `• ${item}`).join('\n')}`,
    `Why we predict this\n${record.rationale}`,
    `Uncertainty\n${record.uncertainty}`,
    `What would move it earlier\n${record.earlier}`,
    `What would move it later\n${record.later}`,
    `The CEO question\n${brief.question}`,
    `Your next 90 days\n${brief.moves.pragmatic}`,
    `Know if it works\n${brief.measure}`,
    `Primary sources and their limits\n\n${sources}`,
    `Selected prediction\nhttps://softcat.ai/horizon/?future=${future.key}`,
  ].join('\n\n');
}

export function validatePredictionHistory(history, today = new Date().toISOString().slice(0, 10), previousHistory = []) {
  const errors = [];
  if (!Array.isArray(history) || !history.length) return ['Prediction history needs a first published prediction for all five futures.'];
  if (!Array.isArray(previousHistory)) return ['Malformed previous prediction history.'];
  if (previousHistory.length > history.length || previousHistory.some((event, index) => !same(event, history[index]))) errors.push('Published prediction history is append-only. Add a correction instead of rewriting a record.');
  const eventIds = new Set(), futureIds = new Set(FUTURES.map(future => future.id));
  for (const [index, event] of history.entries()) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) { errors.push(`Prediction history entry ${index}: malformed event.`); continue; }
    if (!text(event.id) || eventIds.has(event.id)) errors.push(`Prediction history entry ${index}: missing or duplicate event ID.`);
    eventIds.add(event.id);
    if (!realDate(event.date) || event.date > today || (index > 0 && event.date < history[index - 1]?.date)) errors.push(`Prediction history entry ${index}: invalid, future or out-of-order review date.`);
    if (!text(event.reason)) errors.push(`Prediction history entry ${index}: missing review reason.`);
    if (!Array.isArray(event.records) || !event.records.length) { errors.push(`Prediction history entry ${index}: no prediction decisions.`); continue; }
    const reviewed = new Set();
    for (const record of event.records) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) { errors.push(`Prediction history entry ${index}: malformed prediction.`); continue; }
      if (!futureIds.has(record.id) || reviewed.has(record.id)) errors.push(`Prediction history entry ${index}: unknown or repeated future.`);
      reviewed.add(record.id);
      for (const key of ['title', 'milestone', 'rationale', 'uncertainty', 'earlier', 'later']) if (!text(record[key])) errors.push(`${record.id}: missing or malformed ${key}.`);
      if (!predictionDate(record.target_date)) errors.push(`${record.id}: prediction target_date must be a real ISO year-end date (YYYY-12-31).`);
      if (!Array.isArray(record.resolution) || !record.resolution.length || record.resolution.some(item => !text(item))) errors.push(`${record.id}: explicit resolution criteria are required.`);
      if (!Array.isArray(record.evidence) || !record.evidence.length) errors.push(`${record.id}: direct evidence and its limits are required.`);
      else for (const source of record.evidence) if (!source || typeof source !== 'object' || !safeSource(source.url) || !['title', 'date_label', 'finding', 'limit'].every(key => text(source[key]))) errors.push(`${record.id}: incomplete or unsafe evidence snapshot.`);
    }
    if (index === 0 && (reviewed.size !== FUTURES.length || [...futureIds].some(id => !reviewed.has(id)))) errors.push('The first prediction event must cover all five futures exactly once.');
  }
  return errors;
}

export function validatePredictionPayload(data, previousHistory = [], today = new Date().toISOString().slice(0, 10)) {
  try {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return ['Malformed prediction data.'];
    const errors = [];
    if (data.schema !== 1 || typeof data.revision !== 'string' || !/^[a-f0-9]{64}$/.test(data.revision)) errors.push('Unsupported prediction data version.');
    return [...errors, ...validatePredictionHistory(data.history, today, previousHistory)];
  } catch { return ['Malformed prediction data.']; }
}
