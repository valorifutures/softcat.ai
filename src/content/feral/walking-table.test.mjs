import test from 'node:test';
import assert from 'node:assert/strict';
import { HIPS, UPPER, LOWER, OPENING_OFFSETS, tablePose, legPose, wrap, revolutionAt, pointerDelta } from './walking-table.mjs';
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
test('six finite linkages retain both timber lengths throughout a full crank turn', () => {
  assert.equal(HIPS.length, 6);
  for (let angle = -720; angle <= 720; angle += 3) for (const leg of tablePose(angle)) {
    near(distance(leg.hip, leg.knee), UPPER);
    near(distance(leg.knee, leg.foot), LOWER);
    for (const p of Object.values(leg)) { assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y)); assert.ok(p.x > 90 && p.x < 820 && p.y > 200 && p.y < 520); }
  }
});
test('a full turn returns exactly, reversing retraces the same poses without moving the table', () => {
  for (let angle = 0; angle < 360; angle += 7) {
    assert.deepEqual(tablePose(angle), tablePose(angle + 360));
    assert.deepEqual(tablePose(angle), tablePose(angle - 360));
    tablePose(angle).forEach((leg, i) => assert.deepEqual(leg.hip, HIPS[i]));
  }
  assert.notDeepEqual(tablePose(0), tablePose(90));
});
test('offset adjustment changes only the named leg and equals moving its crank phase', () => {
  const offsets = [...OPENING_OFFSETS]; offsets[3] += 77;
  const original = tablePose(31), changed = tablePose(31, offsets);
  for (let i = 0; i < 6; i++) i === 3 ? assert.deepEqual(changed[i], legPose(i, 108)) : assert.deepEqual(changed[i], original[i]);
  assert.notDeepEqual(changed[3], original[3]);
  assert.deepEqual(OPENING_OFFSETS, [0, 180, 60, 240, 120, 300]);
});
test('the drawing remains continuous across the crank seam and each elbow branch', () => {
  for (let i = 0; i < 6; i++) {
    const a = legPose(i, 359.999), b = legPose(i, 0.001);
    assert.ok(distance(a.foot, b.foot) < .01);
    assert.ok(distance(a.knee, b.knee) < .01);
  }
  near(pointerDelta(179, -179), 2);
  near(pointerDelta(-179, 179), -2);
  near(pointerDelta(20, 15), -5);
});
test('one-turn timeline is finite, bounded, finishes at its starting pose and permits an exact held sample', () => {
  const held = revolutionAt(57, 932);
  assert.equal(held.done, false);
  assert.deepEqual(held, revolutionAt(57, 932));
  assert.deepEqual(revolutionAt(57, -100), { angle: 57, done: false });
  assert.deepEqual(revolutionAt(57, 2200), { angle: 57, done: true });
  assert.deepEqual(revolutionAt(57, 1e20), { angle: 57, done: true });
  assert.notDeepEqual(tablePose(held.angle), tablePose(57));
});
test('non-finite angles, offsets and timing cannot produce invalid SVG coordinates', () => {
  for (const value of [NaN, Infinity, -Infinity, undefined]) {
    assert.equal(wrap(value), 0);
    assert.deepEqual(tablePose(value, [value]), tablePose(0));
    assert.deepEqual(revolutionAt(12, value), { angle: 12, done: false });
    for (const leg of tablePose(value)) for (const point of Object.values(leg)) assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
  }
  assert.throws(() => legPose(-1, 0), RangeError);
  assert.throws(() => legPose(6, 0), RangeError);
});
