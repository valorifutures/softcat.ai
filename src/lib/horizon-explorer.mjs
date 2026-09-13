export const STANCES = ['optimistic', 'pragmatic', 'sceptical'];
export const FUTURES = [
  { key: 'agi', id: 'scenario-agi' },
  { key: 'agents', id: 'scenario-agentic-work' },
  { key: 'robotics', id: 'scenario-robotics' },
  { key: 'software', id: 'scenario-software-automation' },
  { key: 'education', id: 'scenario-education-disruption' },
];

// Only explicit ranges and upper bounds are plotted. The legacy `year` field
// is a representative point, not the date claim, so it must never drive a mark.
export function parseTimeframe(value) {
  const label = String(value ?? '').trim();
  const range = /^(\d{4})\s*[-–]\s*(\d{4})$/.exec(label);
  if (range && Number(range[1]) <= Number(range[2])) {
    return { kind: 'range', start: Number(range[1]), end: Number(range[2]), label: `${range[1]}–${range[2]}` };
  }
  const by = /^by (?:end of )?(\d{4})$/i.exec(label);
  if (by) return { kind: 'by', start: Number(by[1]), end: Number(by[1]), label };
  return { kind: 'open', label: label || 'No dated window' };
}

export function timelineDomain(scenarios, referenceYear) {
  const years = scenarios.flatMap(s => STANCES.flatMap(stance => {
    const mark = parseTimeframe(s[stance]?.timeframe);
    return mark.kind === 'open' ? [] : [mark.start, mark.end];
  }));
  const start = Math.min(referenceYear, ...years);
  // Three equal intervals, with whole-year ticks and a little breathing room.
  const interval = Math.max(1, Math.ceil((Math.max(referenceYear, ...years) + 1 - start) / 3));
  return { start, end: start + 3 * interval, ticks: [0, 1, 2, 3].map(n => start + n * interval) };
}

export function markPosition(mark, domain) {
  if (mark.kind === 'open') return null;
  const percent = year => 100 * (year - domain.start) / (domain.end - domain.start);
  return { left: percent(mark.start), width: percent(mark.end) - percent(mark.start), centre: percent((mark.start + mark.end) / 2) };
}

export function readHorizonState(search) {
  const params = new URLSearchParams(search);
  return {
    future: FUTURES.some(f => f.key === params.get('future')) ? params.get('future') : 'agents',
    view: STANCES.includes(params.get('view')) ? params.get('view') : 'pragmatic',
  };
}

export function horizonSearch(search, state) {
  const params = new URLSearchParams(search);
  const safe = readHorizonState(new URLSearchParams(state).toString());
  params.set('future', safe.future);
  params.set('view', safe.view);
  return `?${params}`;
}

export function validateOutlookReview(review, scenarios, today = new Date().toISOString().slice(0, 10)) {
  const errors = [];
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(review.reviewed_at) || review.reviewed_at > today) errors.push('Outlook review needs a real, non-future review date.');
  if (!validDate(review.dates_origin) || review.dates_origin > review.reviewed_at) errors.push('Scenario date origin must precede its review.');
  if (!review.decision?.trim()) errors.push('Outlook review needs an explicit date decision.');
  for (const future of FUTURES) {
    const scenario = scenarios.find(s => s.id === future.id);
    const record = review.futures?.find(s => s.id === future.id);
    if (!scenario || !record) { errors.push(`Missing outlook or review for ${future.id}.`); continue; }
    for (const key of ['title', 'subtitle', 'question', 'watch', 'assessment']) {
      if (!record[key]?.trim()) errors.push(`${future.id}: missing ${key}.`);
    }
    for (const stance of STANCES) {
      if (record.timeframes?.[stance] !== scenario[stance]?.timeframe) errors.push(`${future.id}: ${stance} date changed without a matching evidence review.`);
    }
    if (!record.evidence?.length) errors.push(`${future.id}: no evidence.`);
    for (const source of record.evidence ?? []) {
      let safeUrl = false;
      try { const url = new URL(source.url); safeUrl = url.protocol === 'https:' && !url.username && !url.password; } catch { /* invalid source */ }
      if (!safeUrl || !source.title?.trim() || !source.finding?.trim() || !source.limit?.trim()) errors.push(`${future.id}: evidence needs an HTTPS source, finding and limitation.`);
    }
  }
  if (review.futures?.length !== FUTURES.length || new Set(review.futures?.map(f => f.id)).size !== FUTURES.length) errors.push('Outlook review must cover the five futures exactly once.');
  return errors;
}
