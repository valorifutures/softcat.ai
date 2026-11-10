const sha = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const isoDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;

export function retirementSourceUrl(entry) {
  return `https://github.com/valorifutures/softcat.ai/blob/${entry.sourceRevision}/${entry.sourcePath}`;
}

export function validateEditorialRetirements(review, activeThoughtIds = new Set(), now = Date.now()) {
  const errors = [];
  if (!review || review.version !== 1 || !Array.isArray(review.entries) || !review.reasons || typeof review.reasons !== 'object') return ['Invalid editorial retirement registry.'];
  const today = new Date(now).toISOString().slice(0, 10);
  if (!isoDate(review.reviewedAt) || review.reviewedAt > today) errors.push('Editorial review date is invalid or in the future.');
  if (!sha(review.sourceRevision)) errors.push('The source inventory needs an exact Git revision.');
  if (!sha(review.generatorPolicy?.revision) || review.generatorPolicy?.path !== 'bot/ai_thoughts_bot.py' || typeof review.generatorPolicy?.quote !== 'string' || !review.generatorPolicy.quote.trim()) errors.push('The generator policy record is incomplete.');
  const seen = new Set();
  for (const entry of review.entries) {
    if (!entry || typeof entry !== 'object') { errors.push('Invalid retirement entry.'); continue; }
    const label = typeof entry.id === 'string' ? entry.id : '(missing ID)';
    if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9][a-z0-9-]*$/.test(label)) errors.push(`${label}: invalid retired route ID.`);
    if (seen.has(entry.id)) errors.push(`${label}: duplicate retired route.`);
    seen.add(entry.id);
    if (activeThoughtIds.has(entry.id)) errors.push(`${label}: a retired essay cannot also be in the live content collection.`);
    if (typeof entry.title !== 'string' || !entry.title.trim()) errors.push(`${label}: the original title is missing.`);
    if (!isoDate(entry.date) || !isoDate(entry.retiredAt) || entry.retiredAt < entry.date || entry.retiredAt > today) errors.push(`${label}: invalid publication or retirement date.`);
    if (!Object.hasOwn(review.reasons, entry.reason) || typeof review.reasons[entry.reason] !== 'string' || !review.reasons[entry.reason].trim()) errors.push(`${label}: no retirement reason is recorded.`);
    if (entry.sourcePath !== `src/content/thoughts/${entry.id}.md`) errors.push(`${label}: source path does not match its route.`);
    if (![entry.sourceRevision, entry.sourceBlob, entry.addedCommit].every(sha)) errors.push(`${label}: source history needs exact Git revisions and a blob hash.`);
    if (entry.externalSourceLinks !== 0) errors.push(`${label}: this review records essays with no external source links.`);
  }
  return errors;
}

export function retiredThoughtReferenceError(type, ref, source, retiredIds) {
  if (type !== 'thought' || !retiredIds.has(ref)) return null;
  return ['now-archive.json', 'retired-forecasts.json'].includes(source) ? null : `${source}: retired essay "${ref}" cannot support an active Horizon record.`;
}
