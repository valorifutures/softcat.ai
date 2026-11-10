export const MAX_SPECIMEN = 240;

export const SPECIMENS = Object.freeze([
  'The apparatus is certain. The sentence is not.',
  'Small letters keep their own weather between the rules.',
  'Measure twice; meaning remains outside the room.',
]);

const ASCENDERS = new Set(Array.from('bdfhkltABCDEFGHIJKLMNOPQRSTUVWXYZ'));
const DESCENDERS = new Set(Array.from('gjpqyQ'));
const VOWELS = new Set(Array.from('aeiouAEIOU'));
const NARROW = new Set(Array.from("ilIjtfr.,:;!'|`"));
const WIDE = new Set(Array.from('mwMW@%&'));
const punctuation = value => /\p{P}/u.test(value);
const whitespace = value => /\s/u.test(value);

export function clampSpecimen(value) {
  if (typeof value !== 'string') return '';
  return Array.from(value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')).slice(0, MAX_SPECIMEN).join('');
}

export function classify(character) {
  if (whitespace(character)) return 'space';
  if (punctuation(character)) return 'punctuation';
  if (DESCENDERS.has(character)) return 'descender';
  if (ASCENDERS.has(character)) return 'ascender';
  return 'x-height';
}

export function characterWidth(character) {
  if (whitespace(character)) return 0.44;
  if (NARROW.has(character)) return 0.42;
  if (WIDE.has(character)) return 1.08;
  if (punctuation(character)) return 0.5;
  if (/\p{Lu}/u.test(character)) return 0.82;
  if (/\p{N}/u.test(character)) return 0.7;
  return 0.68;
}

const HEIGHT = Object.freeze({ ascender: 1, 'x-height': 0.66, descender: 0.9, punctuation: 0.38, space: 0.08 });

function positions(characters) {
  let cursor = 0;
  return characters.map((character, index) => {
    const width = characterWidth(character);
    const item = { index, character, className: classify(character), width, start: cursor, centre: cursor + width / 2 };
    cursor += width;
    return item;
  });
}

function echoes(characters) {
  const folded = characters.map(character => character.toLocaleLowerCase('en-GB'));
  const found = [];
  for (let first = 0; first < folded.length - 1; first++) {
    if (whitespace(folded[first])) continue;
    for (let second = first + 2; second < folded.length - 1; second++) {
      let length = 0;
      while (length < 5 && second + length < folded.length && folded[first + length] === folded[second + length]) length++;
      if (length < 2) continue;
      while (length > 1 && whitespace(folded[first + length - 1])) length--;
      if (length > 1) found.push({ first, second, length, text: characters.slice(first, first + length).join('') });
    }
  }
  found.sort((a, b) => b.length - a.length || a.first - b.first || a.second - b.second);
  const accepted = [];
  for (const echo of found) {
    if (accepted.some(item => item.first === echo.first && item.second === echo.second)) continue;
    if (accepted.some(item => item.first === echo.first || item.second === echo.second)) continue;
    accepted.push(echo);
    if (accepted.length === 12) break;
  }
  return accepted;
}

const rulerPosition = (items, index, total) => total ? items[index].centre / total * 100 : 0;

export function measureSpecimen(input) {
  const text = clampSpecimen(input);
  const characters = Array.from(text);
  const items = positions(characters);
  const totalWidth = items.reduce((sum, item) => sum + item.width, 0);
  const totalMass = items.reduce((sum, item) => sum + item.width * HEIGHT[item.className], 0);
  const moment = items.reduce((sum, item) => sum + item.centre * item.width * HEIGHT[item.className], 0);
  const balance = totalMass ? moment / totalMass : 0;
  const vowels = items.filter(item => VOWELS.has(item.character));
  const marks = items.filter(item => item.className === 'punctuation');
  const counts = Object.fromEntries(Object.keys(HEIGHT).map(name => [name, items.filter(item => item.className === name).length]));
  return Object.freeze({
    text,
    characters: Object.freeze(items.map(Object.freeze)),
    totalWidth,
    balance,
    balancePercent: totalWidth ? balance / totalWidth * 100 : 0,
    counts: Object.freeze(counts),
    vowels: Object.freeze(vowels.map(item => Object.freeze({ index: item.index, position: rulerPosition(items, item.index, totalWidth) }))),
    punctuation: Object.freeze(marks.map(item => Object.freeze({ index: item.index, position: rulerPosition(items, item.index, totalWidth) }))),
    vowelCentre: vowels.length ? vowels.reduce((sum, item) => sum + item.centre, 0) / vowels.length / totalWidth * 100 : null,
    punctuationCentre: marks.length ? marks.reduce((sum, item) => sum + item.centre, 0) / marks.length / totalWidth * 100 : null,
    echoes: Object.freeze(echoes(characters).map(Object.freeze)),
  });
}

export function jawBoundary(report, percent) {
  const bounded = Math.max(0, Math.min(100, Number.isFinite(Number(percent)) ? Number(percent) : 0));
  if (!report.characters.length || !report.totalWidth) return Object.freeze({ boundary: 0, left: '', right: '', position: 0 });
  const target = bounded / 100 * report.totalWidth;
  const stops = [0, ...report.characters.map(item => item.start + item.width)];
  let boundary = 0;
  for (let index = 1; index < stops.length; index++) {
    if (Math.abs(stops[index] - target) < Math.abs(stops[boundary] - target)) boundary = index;
  }
  return Object.freeze({
    boundary,
    left: boundary ? report.characters[boundary - 1].character : '',
    right: boundary < report.characters.length ? report.characters[boundary].character : '',
    position: stops[boundary] / report.totalWidth * 100,
  });
}
