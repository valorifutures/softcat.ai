const dayFileSuffix = date => `/${date}.json`;

export function radarDayKey(paths, date) {
  return paths.find(path => path.endsWith(dayFileSuffix(date)));
}

export function missingRadarDayFiles(dates, paths) {
  return dates.filter(date => !radarDayKey(paths, date));
}

export function assertRadarDayFiles(dates, paths) {
  const missing = missingRadarDayFiles(dates, paths);
  if (missing.length > 0) {
    throw new Error(`Radar manifest lists missing day files: ${missing.join(', ')}`);
  }
}
