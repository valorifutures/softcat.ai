export const DIFF_INPUT_LIMIT = 200_000;
export const DIFF_TIMEOUT = 2_000;
const MAX_CELLS = 2_000_000;
const MAX_SEGMENTS = 600;

const tokenise = (text) => text.match(/\s+|\S+/gu) || [];
function append(changes, type, value) {
  if (!value) return;
  if (changes.at(-1)?.type === type) changes.at(-1).value += value;
  else changes.push({ type, value });
}

export function comparePrompts(original, revised, settings = {}) {
  if (typeof original !== 'string' || typeof revised !== 'string' || original.length > DIFF_INPUT_LIMIT || revised.length > DIFF_INPUT_LIMIT) {
    return { status: 'limit', message: 'Keep each prompt within 200,000 characters. Compare a smaller section of a larger prompt.', changes: [] };
  }
  if (original === revised) return { status: 'identical', message: original ? 'The two prompts are identical, including whitespace.' : 'Both prompts are empty.', changes: original ? [{ type: 'equal', value: original }] : [] };
  const a = tokenise(original), b = tokenise(revised);
  let start = 0, endA = a.length, endB = b.length;
  while (start < endA && start < endB && a[start] === b[start]) start++;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const prefix = a.slice(0, start).join(''), suffix = a.slice(endA).join('');
  const middleA = a.slice(start, endA), middleB = b.slice(start, endB);
  const m = middleA.length, n = middleB.length;
  const coarse = () => {
    const changes = [];
    append(changes, 'equal', prefix); append(changes, 'removed', middleA.join(''));
    append(changes, 'added', middleB.join('')); append(changes, 'equal', suffix);
    return { status: 'coarse', message: 'Showing changed blocks because a detailed word comparison would exceed the work or display limit. Shared text may remain inside a marked block. All original text is preserved.', changes };
  };
  if ((m + 1) * (n + 1) > (settings.maxCells ?? MAX_CELLS)) return coarse();
  const width = n + 1;
  const table = new Uint32Array((m + 1) * width);
  for (let i = 1; i <= m; i++) {
    const row = i * width, previous = row - width;
    for (let j = 1; j <= n; j++) table[row + j] = middleA[i - 1] === middleB[j - 1] ? table[previous + j - 1] + 1 : Math.max(table[previous + j], table[row + j - 1]);
  }
  const reversed = [];
  let i = m, j = n;
  while (i || j) {
    if (i && j && middleA[i - 1] === middleB[j - 1]) { reversed.push({ type: 'equal', value: middleA[--i] }); j--; }
    else if (j && (!i || table[i * width + j - 1] >= table[(i - 1) * width + j])) reversed.push({ type: 'added', value: middleB[--j] });
    else reversed.push({ type: 'removed', value: middleA[--i] });
  }
  const changes = [];
  append(changes, 'equal', prefix);
  for (const change of reversed.reverse()) append(changes, change.type, change.value);
  append(changes, 'equal', suffix);
  if (changes.length > (settings.maxSegments ?? MAX_SEGMENTS)) return coarse();
  return { status: 'complete', message: 'Compared words and whitespace. Removed text is marked in A and added text in B.', changes };
}

export function formatSignedUsd(value, signed = false) {
  if (!Number.isFinite(value)) return 'Unknown';
  const magnitude = Number(Math.abs(value).toPrecision(4)).toLocaleString('en-US', { maximumFractionDigits: 12 });
  return `${value < 0 ? '−' : signed && value > 0 ? '+' : ''}$${magnitude}`;
}
