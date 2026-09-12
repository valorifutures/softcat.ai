// A successful historical run is evidence of that run, not a live heartbeat.
export function timestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return NaN;
  return Date.parse(value);
}

export function newestRun(runs, predicate = () => true) {
  return runs.filter((run) => Number.isFinite(timestamp(run.timestamp)) && predicate(run))
    .reduce((latest, run) => !latest || timestamp(run.timestamp) > timestamp(latest.timestamp) ? run : latest, null);
}

export function formatRecordedTime(value) {
  const time = timestamp(value);
  if (!Number.isFinite(time)) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(time) + ' UTC';
}

export function relativeAge(value, now = Date.now()) {
  const time = timestamp(value);
  if (!Number.isFinite(time)) return 'Date unavailable';
  const age = now - time;
  if (age < -60_000) return 'Future timestamp';
  if (age < 60_000) return 'less than a minute ago';
  if (age < 3_600_000) return `${Math.floor(age / 60_000)}m ago`;
  if (age < 86_400_000) return `${Math.floor(age / 3_600_000)}h ago`;
  return `${Math.floor(age / 86_400_000)}d ago`;
}

export function overdueHours(cron = '') {
  const fields = cron.trim().split(/\s+/);
  return fields.length === 5 && fields[4] !== '*' ? 240 : 36;
}

export function recordState(run, thresholdHours = 36, now = Date.now()) {
  const time = timestamp(run?.timestamp);
  if (!Number.isFinite(time)) return { label: 'No dated record', tone: 'muted' };
  if (time > now + 60_000) return { label: 'Check timestamp', tone: 'amber' };
  if (run.status === 'error') return { label: 'Last run failed', tone: 'red' };
  if (now - time > thresholdHours * 3_600_000) return { label: 'No recent run recorded', tone: 'amber' };
  if (run.status === 'partial') return { label: 'Last run partial', tone: 'amber' };
  if (run.status === 'success') return { label: 'Last run succeeded', tone: 'green' };
  return { label: 'Result unavailable', tone: 'muted' };
}

export function runsInWindow(runs, end, days = 7) {
  const start = end - days * 86_400_000;
  return runs.filter((run) => {
    const time = timestamp(run.timestamp);
    return time >= start && time <= end;
  });
}

export function latestPriceRun(runs) {
  return newestRun(runs, (run) => run.bot === 'model_bot' && run.status === 'success' &&
    (run.job === 'prices' || (!run.job && run.output_files?.includes('src/data/models.json'))));
}
