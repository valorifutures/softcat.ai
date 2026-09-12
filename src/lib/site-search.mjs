const normalise = value => String(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + Number(i < a.length || j < b.length) <= 1;
}

export function searchScore(query, entry) {
  const q = normalise(query);
  if (q.length < 2) return 0;
  const title = normalise(entry.title);
  const tags = normalise((entry.tags ?? []).join(' '));
  const summary = normalise(entry.summary);
  const titleWords = title.split(' '), tagWords = tags.split(' '), summaryWords = summary.split(' ');
  let score = 0;
  for (const token of q.split(' ')) {
    const starts = word => word.startsWith(token) || (token.length > 3 && token.endsWith('s') && word === token.slice(0, -1));
    if (titleWords.includes(token)) score += 80;
    else if (titleWords.some(starts)) score += 55;
    else if (tagWords.some(starts)) score += 35;
    else if (summaryWords.includes(token)) score += 20;
    else if (summaryWords.some(starts)) score += 12;
    else if (token.length >= 5 && titleWords.some(word => word.length >= 5 && oneEditApart(token, word))) score += 8;
    else return 0; // Every query word must have support. No scattered-letter matches.
  }
  if ((entry.tags ?? []).some(tag => normalise(tag) === q)) score += 200;
  if (entry.url?.startsWith('/lab/')) score += 35;
  if (title === q) score += 200;
  else if (title.startsWith(q)) score += 100;
  else if (title.includes(q)) score += 60;
  return score;
}

export function searchEntries(entries, query, limit = 12) {
  return entries.map(entry => ({ entry, score: searchScore(query, entry) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .slice(0, limit).map(result => result.entry);
}

export function validateSearchIndex(value) {
  if (!Array.isArray(value)) throw new Error('Search index must be an array.');
  for (const entry of value) {
    if (!entry || ['title', 'summary', 'url', 'type'].some(key => typeof entry[key] !== 'string') || !entry.title.trim()) throw new Error('Search entry is incomplete.');
    const url = new URL(entry.url, 'https://softcat.ai');
    if (!entry.url.startsWith('/') || url.origin !== 'https://softcat.ai' || entry.url.includes('\\')) throw new Error('Search entry must link to this site.');
    if (entry.tags != null && (!Array.isArray(entry.tags) || entry.tags.some(tag => typeof tag !== 'string'))) throw new Error('Search tags must be strings.');
  }
  return value;
}
