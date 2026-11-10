import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAX_SPECIMEN, SPECIMENS, clampSpecimen, classify, characterWidth, measureSpecimen, jawBoundary } from './caliper.mjs';

const pageSource = readFileSync(new URL('../../pages/feral/caliper.astro', import.meta.url), 'utf8');

test('authored specimens are bounded, distinct and measurable', () => {
  assert.equal(SPECIMENS.length, 3);
  assert.equal(new Set(SPECIMENS).size, 3);
  for (const specimen of SPECIMENS) {
    const report = measureSpecimen(specimen);
    assert.equal(report.text, specimen);
    assert.ok(report.totalWidth > 0);
    assert.ok(report.balancePercent > 0 && report.balancePercent < 100);
  }
});

test('specimens remove controls and stop at 240 Unicode characters', () => {
  const text = `a\u0000${'😀'.repeat(MAX_SPECIMEN + 10)}`;
  const clean = clampSpecimen(text);
  assert.equal(Array.from(clean).length, MAX_SPECIMEN);
  assert.equal(clean.includes('\u0000'), false);
  assert.equal(clampSpecimen(null), '');
});

test('classes and widths stay deterministic', () => {
  assert.deepEqual(['b', 'a', 'g', ' ', '.'].map(classify), ['ascender', 'x-height', 'descender', 'space', 'punctuation']);
  assert.ok(characterWidth('i') < characterWidth('a'));
  assert.ok(characterWidth('W') > characterWidth('a'));
  assert.equal(characterWidth('a'), characterWidth('a'));
});

test('all counts and positions come from the bounded string', () => {
  const report = measureSpecimen('Bad dog.');
  assert.equal(Object.values(report.counts).reduce((a, b) => a + b, 0), Array.from(report.text).length);
  assert.equal(report.vowels.length, 2);
  assert.equal(report.punctuation.length, 1);
  assert.ok(report.vowelCentre > 0 && report.vowelCentre < 100);
  assert.ok(report.punctuationCentre > report.vowelCentre);
});

test('empty and mark-free specimens remain explicit', () => {
  const empty = measureSpecimen('');
  assert.equal(empty.totalWidth, 0);
  assert.equal(empty.balancePercent, 0);
  assert.equal(empty.vowelCentre, null);
  assert.equal(empty.punctuationCentre, null);
  assert.deepEqual(empty.echoes, []);
  const consonants = measureSpecimen('rhythm');
  assert.equal(consonants.vowelCentre, null);
});

test('echoes find bounded repeated fragments without semantic claims', () => {
  const report = measureSpecimen('letter setter letter');
  assert.ok(report.echoes.length > 0);
  assert.ok(report.echoes.some(echo => echo.length >= 2));
  assert.ok(report.echoes.every(echo => echo.length <= 5));
  assert.ok(report.echoes.length <= 12);
});

test('the balance responds to visible class height rather than text meaning', () => {
  const lowLeft = measureSpecimen('aaaa HHHH');
  const highLeft = measureSpecimen('HHHH aaaa');
  assert.ok(lowLeft.balancePercent > 50);
  assert.ok(highLeft.balancePercent < 50);
});

test('jaw boundaries are finite, bounded and character-exact', () => {
  const report = measureSpecimen('abc');
  assert.deepEqual(jawBoundary(report, -20), { boundary: 0, left: '', right: 'a', position: 0 });
  assert.deepEqual(jawBoundary(report, 1000), { boundary: 3, left: 'c', right: '', position: 100 });
  const middle = jawBoundary(report, 50);
  assert.equal(middle.boundary, 1);
  assert.equal(middle.left, 'a');
  assert.equal(middle.right, 'b');
  assert.deepEqual(jawBoundary(measureSpecimen(''), NaN), { boundary: 0, left: '', right: '', position: 0 });
});

test('client-created measurement marks retain styles after an interactive render', () => {
  const dynamicDescendants = [
    /#specimen-line\s+:global\(\.glyph\)/,
    /#skyline\s+:global\(i\)/,
    /#echo-arcs\s+:global\(path\)/,
    /#vowel-dots\s+:global\(\.dot\)/,
    /#punctuation-dots\s+:global\(\.dot\)/,
  ];
  for (const selector of dynamicDescendants) {
    assert.match(pageSource, selector, `${selector} must not require Astro's generated scope attribute on its dynamic child`);
  }
});
