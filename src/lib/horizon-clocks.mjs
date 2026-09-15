import { FUTURES, STANCES, parseTimeframe, validateOutlookReview } from './horizon-explorer.mjs';

export const CLOCK_REFRESH_MS = 5 * 60 * 1000;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

// These are display boundaries for the published wording, not predicted instants
// of arrival. Whole-year windows include their final calendar year.
export function scenarioClock(timeframe, now) {
  const mark = parseTimeframe(timeframe);
  if (mark.kind === 'open' || !Number.isFinite(now)) return { phase: 'undated', label: 'No dated boundary', target: null, wording: mark.label };
  const opening = Date.UTC(mark.start, 0, 1);
  const closing = Date.UTC(mark.end + 1, 0, 1);
  if (now >= closing) return { phase: 'elapsed', label: mark.kind === 'by' ? 'Deadline elapsed' : 'Window elapsed', target: null, wording: mark.label };
  const phase = mark.kind === 'by' ? 'deadline' : now < opening ? 'opening' : 'open';
  const target = phase === 'opening' ? opening : closing;
  const remaining = Math.ceil((target - now) / 1000);
  return {
    phase, target, wording: mark.label,
    label: phase === 'opening' ? 'Window opens in' : phase === 'open' ? 'Window closes in' : 'Scenario deadline in',
    days: Math.floor(remaining / 86400), hours: Math.floor(remaining / 3600) % 24,
    minutes: Math.floor(remaining / 60) % 60, seconds: remaining % 60,
  };
}

export function clockCaption(clock) {
  if (clock.target === null) return { summary: `${clock.phase === 'elapsed' ? 'Review due' : 'Open-ended'}. ${clock.label}` };
  const destination = clock.phase === 'opening' ? 'until this scenario’s window opens' : clock.phase === 'open' ? 'until this scenario’s window closes' : 'until this scenario’s deadline';
  const value = clock.days === 0 ? '<1' : clock.days.toLocaleString('en-GB');
  const unit = clock.days <= 1 ? 'day' : 'days';
  return { value, unit, destination, summary: `${clock.days === 0 ? 'Less than 1 day' : `${value} ${unit}`} ${destination}` };
}

export function clockMovement(previous, current, stance) {
  if (!previous) return { kind: 'baseline', label: 'Baseline' };
  if (previous.definition !== current.definition) return { kind: 'scope', label: 'Scope changed' };
  const before = parseTimeframe(previous.timeframes[stance]);
  const after = parseTimeframe(current.timeframes[stance]);
  if (same(before, after)) return { kind: 'unchanged', label: 'Unchanged' };
  if (before.kind === 'open' && after.kind !== 'open') return { kind: 'dated', label: 'Dated target added' };
  if (before.kind !== 'open' && after.kind === 'open') return { kind: 'undated', label: 'Target now undated' };
  if (before.kind === after.kind && before.kind !== 'open') {
    const left = after.start - before.start, right = after.end - before.end;
    if (left <= 0 && right >= 0 && left !== right) return { kind: 'wider', label: 'Window widened' };
    if (left >= 0 && right <= 0 && left !== right) return { kind: 'narrower', label: 'Window narrowed' };
    if (left <= 0 && right <= 0 && (left || right)) return { kind: 'earlier', label: 'Moved earlier' };
    if (left >= 0 && right >= 0 && (left || right)) return { kind: 'later', label: 'Moved later' };
  }
  return { kind: 'reworded', label: 'Wording revised' };
}

export function clockHistory(history, id, stance) {
  let previous;
  return history.flatMap(event => {
    const record = event.records.find(record => record.id === id);
    if (!record) return [];
    const item = { ...event, record, previous, movement: clockMovement(previous, record, stance) };
    previous = record;
    return [item];
  });
}

export function validateClockHistory(history, review, scenarios, today = new Date().toISOString().slice(0, 10), previousHistory = []) {
  const errors = [];
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value && value <= today;
  const source = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } };
  if (!Array.isArray(history) || history.length < 2) return ['Clock history needs a baseline and an evidence review.'];
  if (history[0]?.kind !== 'baseline' || history[0]?.date !== review.dates_origin) errors.push('The clock baseline must retain the original scenario date.');
  if (previousHistory.length > history.length || previousHistory.some((event, i) => !same(event, history[i]))) errors.push('Published clock history is append-only. Add a correction instead of rewriting a record.');
  const ids = new Set(), futureIds = new Set(FUTURES.map(f => f.id));
  const latest = new Map();
  for (const [index, event] of history.entries()) {
    if (!event || typeof event !== 'object') { errors.push(`Clock history entry ${index}: malformed record.`); continue; }
    if (!text(event.id) || ids.has(event.id)) errors.push(`Clock history entry ${index}: missing or duplicate ID.`);
    ids.add(event.id);
    if (!date(event.date) || (index > 0 && event.date < history[index - 1]?.date)) errors.push(`Clock history entry ${index}: invalid, future or out-of-order date.`);
    if (event.kind !== (index === 0 ? 'baseline' : 'review')) errors.push(`Clock history entry ${index}: invalid kind.`);
    if (index === 0 && !source(event.source)) errors.push('The baseline needs its preserved source.');
    if (!Array.isArray(event.records) || !event.records.length) { errors.push(`Clock history entry ${index}: no decisions.`); continue; }
    const reviewed = new Set();
    for (const record of event.records) {
      if (!record || typeof record !== 'object') { errors.push(`Clock history entry ${index}: malformed decision.`); continue; }
      if (!futureIds.has(record.id) || reviewed.has(record.id)) errors.push(`Clock history entry ${index}: unknown or repeated future.`);
      reviewed.add(record.id);
      if (!text(record.definition)) errors.push(`${record.id}: the reviewed threshold is missing.`);
      for (const stance of STANCES) {
        const frame = record.timeframes?.[stance];
        if (!text(frame) || (/^\d{4}\s*[-–]\s*\d{4}$/.test(frame) && parseTimeframe(frame).kind !== 'range')) errors.push(`${record.id}: invalid ${stance} timeframe.`);
      }
      if (index > 0) {
        if (!text(record.reason) || !Array.isArray(record.evidence) || !record.evidence.length) errors.push(`${record.id}: an evidence review needs its reason and sources.`);
        if (Array.isArray(record.evidence)) for (const evidence of record.evidence) if (!evidence || !source(evidence.url) || !['title', 'finding', 'limit', 'date_label'].every(key => text(evidence[key]))) errors.push(`${record.id}: incomplete evidence snapshot.`);
        latest.set(record.id, { date: event.date, record });
      }
    }
    if (index === 0 && (reviewed.size !== FUTURES.length || [...futureIds].some(id => !reviewed.has(id)))) errors.push('The baseline must cover all five futures.');
  }
  if (history.at(-1)?.date !== review.reviewed_at) errors.push('The latest clock review must match the outlook review date.');
  for (const { id } of FUTURES) {
    const item = latest.get(id)?.record, current = review.futures?.find(f => f.id === id), scenario = scenarios.find(f => f.id === id);
    if (!item || !current || !scenario) { errors.push(`${id}: no current reviewed clock.`); continue; }
    if (!same(item.timeframes, current.timeframes) || STANCES.some(stance => item.timeframes?.[stance] !== scenario[stance]?.timeframe)) errors.push(`${id}: current dates have no matching clock review.`);
    if (item.definition !== scenario.definition) errors.push(`${id}: the threshold changed without a clock review.`);
    if (item.reason !== current.assessment || !same(item.evidence, current.evidence)) errors.push(`${id}: the current evidence or assessment changed without a clock review.`);
  }
  return errors;
}

export function validateClockPayload(data, previousHistory = [], today = new Date().toISOString().slice(0, 10)) {
  try {
    const errors = [];
    if (data.schema !== 1 || !/^[a-f0-9]{64}$/.test(data.revision)) errors.push('Unsupported clock data version.');
    if (!Array.isArray(data.scenarios) || data.scenarios.length !== FUTURES.length || new Set(data.scenarios.map(s => s.id)).size !== FUTURES.length) errors.push('Clock data must include five distinct scenarios.');
    for (const scenario of data.scenarios ?? []) for (const stance of STANCES) for (const key of ['assumptions', 'blockers', 'implication']) if (typeof scenario[stance]?.[key] !== 'string' || !scenario[stance][key].trim()) errors.push('Incomplete scenario briefing.');
    errors.push(...validateOutlookReview(data.review, data.scenarios, today));
    errors.push(...validateClockHistory(data.history, data.review, data.scenarios, today, previousHistory));
    if (!Array.isArray(data.briefs) || data.briefs.length !== FUTURES.length || new Set(data.briefs.map(b => b.id)).size !== FUTURES.length) errors.push('Five distinct decision briefs are required.');
    for (const future of FUTURES) {
      const brief = data.briefs.find(b => b.id === future.id);
      if (![brief?.question, brief?.measure, ...STANCES.map(stance => brief?.moves?.[stance])].every(value => typeof value === 'string' && value.trim())) errors.push(`${future.id}: incomplete decision brief.`);
    }
    return errors;
  } catch { return ['Malformed clock data.']; }
}

export const formatClockDate = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
