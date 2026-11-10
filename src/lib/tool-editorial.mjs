const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const validDate = (value, now) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value && Date.parse(value) <= now;

export function toolReviewErrors(entry, now = Date.now()) {
  if (entry.draft === true) return [];
  const review = entry.review;
  if (!review || typeof review !== 'object') return ['Published tool guides need an editorial review record.'];
  const errors = [];
  if (!validDate(review.reviewedAt, now) || Date.parse(review.reviewedAt) < new Date(entry.date).valueOf()) errors.push('The tool review date is invalid.');
  if (!sha(review.previousRevision)) errors.push('The earlier guide needs an exact source revision.');
  if (typeof review.summary !== 'string' || !review.summary.trim()) errors.push('The tool review needs a correction summary.');
  if (!Array.isArray(review.evidence) || !review.evidence.length || review.evidence.some(url => typeof url !== 'string' || !/^https:\/\/github\.com\/valorifutures\/softcat\.ai\/(?:pull\/\d+|blob\/[a-f0-9]{40}\/.+)$/.test(url))) errors.push('The review needs inspectable project evidence.');
  return errors;
}

export function toolRetirementErrors(review, activeIds = new Set(), now = Date.now()) {
  if (review?.version !== 1 || !Array.isArray(review.entries) || typeof review.reason !== 'string' || !review.reason.trim()) return ['Invalid tool retirement record.'];
  const errors = [], seen = new Set();
  if (!validDate(review.reviewedAt, now)) errors.push('Invalid tool retirement review date.');
  for (const entry of review.entries) {
    if (!entry || !/^[a-z0-9][a-z0-9-]*$/.test(entry.id)) { errors.push('Invalid retired tool route.'); continue; }
    if (seen.has(entry.id) || activeIds.has(entry.id)) errors.push(`${entry.id}: retired tool route is duplicated or active.`);
    seen.add(entry.id);
    if (typeof entry.title !== 'string' || !entry.title.trim()) errors.push(`${entry.id}: the original title is missing.`);
    if (entry.sourcePath !== `src/content/tools/${entry.id}.md` || ![entry.sourceRevision, entry.sourceBlob, entry.addedCommit].every(sha)) errors.push(`${entry.id}: exact source history is missing.`);
    if (!validDate(entry.date, now) || !validDate(entry.retiredAt, now) || entry.date > entry.retiredAt) errors.push(`${entry.id}: invalid publication or retirement date.`);
    if (entry.lastLinkCheck !== null && (!validDate(entry.lastLinkCheck, now) || entry.lastLinkCheck > entry.retiredAt)) errors.push(`${entry.id}: invalid historical link-check date.`);
    if (!['bot', 'earlier-recommendation'].includes(entry.origin)) errors.push(`${entry.id}: the origin record is missing.`);
    try { const url = new URL(entry.sourceLink); if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error(); }
    catch { errors.push(`${entry.id}: the original external link is invalid.`); }
  }
  return errors;
}
