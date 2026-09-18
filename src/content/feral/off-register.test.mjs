import test from 'node:test';
import assert from 'node:assert/strict';
import { INKS, LIMITS, initialPlates, normalisePlates, adjustPlate, alignPlates, resetPlate, registrationSummary, renderPrint, pullPrint } from './off-register.mjs';

test('the three original plates contain distinct geometry and fresh initial state', () => {
  assert.equal(new Set(INKS.map(ink => ink.shape)).size, 3);
  const state = initialPlates(); state[0].x = 80;
  assert.equal(initialPlates()[0].x, -18);
});
test('each axis clamps and rounds and rejects non-finite values', () => {
  for (const [axis, limit] of Object.entries(LIMITS)) {
    assert.equal(adjustPlate(initialPlates(), 1, axis, 999)[1][axis], limit);
    assert.equal(adjustPlate(initialPlates(), 1, axis, -999)[1][axis], -limit);
    assert.equal(adjustPlate(initialPlates(), 1, axis, '12.4')[1][axis], 12);
    for (const value of [NaN, Infinity, '<script>']) assert.equal(adjustPlate(initialPlates(), 1, axis, value)[1][axis], 0);
  }
});
test('adjustment changes one plate and never mutates its source', () => {
  const state = initialPlates();
  const changed = adjustPlate(state, 0, 'x', 40);
  assert.equal(state[0].x, -18);
  assert.equal(changed[0].x, 40);
  assert.deepEqual(changed.slice(1), state.slice(1));
  assert.deepEqual(adjustPlate(state, -1, 'x', 5), state);
  assert.deepEqual(adjustPlate(state, 0, 'shape', 'bad'), state);
});
test('align zeros all registrations; reset restores only the selected initial plate', () => {
  const aligned = alignPlates();
  assert.ok(aligned.every(p => Object.values(p).every(value => value === 0)));
  const reset = resetPlate(aligned, 2);
  assert.deepEqual(reset[2], initialPlates()[2]);
  assert.deepEqual(reset.slice(0, 2), aligned.slice(0, 2));
});
test('registration is text as well as geometry', () => {
  const state = adjustPlate(initialPlates(), 1, 'rotation', 30);
  assert.match(registrationSummary(state), /Cobalt: horizontal 16, vertical -12, rotation 30°/);
  assert.match(renderPrint(state), /translate\(16 -12\) rotate\(30 250 300\)/);
  assert.notEqual(renderPrint(state), renderPrint(initialPlates()));
});
test('export is a complete standalone SVG with explicit two- and three-ink intersections', () => {
  const svg = renderPrint(initialPlates());
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.endsWith('</svg>'));
  for (const id of ['plate-0', 'plate-1', 'plate-2', 'paper-edge']) assert.match(svg, new RegExp(`id="${id}"`));
  assert.equal((svg.match(/<clipPath /g) || []).length, 4);
  for (const colour of ['#392264', '#dc5125', '#397557', '#343a38']) assert.ok(svg.includes(colour));
  assert.doesNotMatch(svg, /<script|<image|<foreignObject|href=|style=|filter=|mix-blend/);
});
test('every clipping path contains only direct permitted shapes, including transformed and frozen plates', () => {
  // This artwork uses only self-closing SVG basic shapes. Checking the complete
  // content rejects a group wrapper even when all the shapes inside it are valid.
  const checkClipContents = svg => {
    const clips = [...svg.matchAll(/<clipPath\b([^>]*)>([\s\S]*?)<\/clipPath>/g)];
    assert.equal(clips.length, 4);
    for (const [, attributes, content] of clips) {
      assert.match(content, /<(?:circle|ellipse|line|path|polygon|polyline|rect)\b/);
      assert.equal(content.replace(/<(?:circle|ellipse|line|path|polygon|polyline|rect)\b[^<>]*\/>/g, '').trim(), '', `Invalid clipPath content: ${attributes}`);
    }
  };
  const states = [initialPlates(), alignPlates(), [{ x: -90, y: 90, rotation: -30 }, { x: 90, y: -90, rotation: 30 }, { x: 0, y: 0, rotation: 0 }]];
  for (const state of states) {
    const svg = renderPrint(state);
    checkClipContents(svg);
    checkClipContents(pullPrint(state).svg);
    state.forEach((plate, index) => {
      assert.ok(svg.includes(`<clipPath id="plate-${index}" clipPathUnits="userSpaceOnUse" transform="translate(${plate.x} ${plate.y}) rotate(${plate.rotation} 250 300)">${INKS[index].shape}</clipPath>`));
    });
  }
  const invalidGroup = renderPrint(initialPlates()).replace(/(<clipPath\b[^>]*>)([\s\S]*?)(<\/clipPath>)/, '$1<g>$2</g>$3');
  assert.throws(() => checkClipContents(invalidGroup), /Invalid clipPath content/);
});
test('pull is immutable, detached and byte-identical to the SVG preview at pull time', () => {
  const state = initialPlates();
  const preview = renderPrint(state);
  const proof = pullPrint(state);
  state[0].x = 90;
  assert.equal(proof.svg, preview);
  assert.equal(proof.plates[0].x, -18);
  assert.throws(() => { proof.plates[0].x = 55; }, TypeError);
  const replacement = pullPrint(state);
  assert.notEqual(replacement.svg, proof.svg);
  assert.equal(proof.svg, renderPrint(initialPlates()));
});
test('normalisation prevents hostile state from reaching exported markup', () => {
  assert.deepEqual(normalisePlates(null), alignPlates());
  const svg = renderPrint([{ x: '"/><script>bad</script>', y: Infinity, rotation: NaN }]);
  assert.doesNotMatch(svg, /<script|Infinity|NaN/);
});
