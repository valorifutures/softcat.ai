import test from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, AUDIO, originalColony, wake, remainingMs, pause, resume, setPace, hatch, shareClock, scatter, tick, marks, mouthSvg, audioPlan } from './brux.mjs';

test('the original colony has seven distinct clocks and detached fresh state', () => {
  const one = originalColony();
  assert.equal(one.mouths.length, 7);
  assert.equal(new Set(one.mouths.map(m => m.bpm)).size, 7);
  assert.equal(one.running, false);
  one.mouths[0].bpm = 144;
  assert.equal(originalColony().mouths[0].bpm, 57);
  assert.equal(wake().running, true);
});
test('hatching stops at twelve without mutating prior colonies or duplicating IDs', () => {
  const initial = wake();
  let colony = initial;
  for (let i = 0; i < 50; i++) colony = hatch(colony);
  assert.equal(initial.mouths.length, 7);
  assert.equal(colony.mouths.length, LIMITS.mouths);
  assert.equal(new Set(colony.mouths.map(m => m.id)).size, 12);
  assert.equal(hatch(colony), colony);
});
test('Wake preserves prepared mouths and paces; a fresh wake restores the original colony', () => {
  const prepared = setPace(hatch(originalColony()), 0, 130);
  const started = wake(prepared);
  assert.equal(started.mouths.length, 8);
  assert.equal(started.mouths[0].bpm, 130);
  assert.equal(started.usedMs, 0);
  assert.equal(started.running, true);
  started.mouths[0].bpm = 60;
  assert.equal(prepared.mouths[0].bpm, 130);
  assert.equal(wake().mouths.length, 7);
  assert.equal(wake().mouths[0].bpm, 57);
});
test('pace changes one clock, clamps hostile values and preserves the source', () => {
  const colony = wake();
  assert.equal(setPace(colony, 1, 999).mouths[1].bpm, 144);
  assert.equal(setPace(colony, 1, -99).mouths[1].bpm, 48);
  assert.equal(setPace(colony, 1, '73.7').mouths[1].bpm, 74);
  for (const value of [NaN, Infinity, '<script>']) assert.equal(setPace(colony, 1, value).mouths[1].bpm, 90);
  assert.equal(colony.mouths[1].bpm, 71);
  assert.deepEqual(setPace(colony, 100, 90), colony);
});
test('sharing produces an immediate pulse without erasing different rates; they separate', () => {
  const shared = shareClock(wake());
  assert.ok(shared.mouths.every(m => m.phase === 0 && m.pulseMs === LIMITS.pulseMs));
  let colony = shared;
  for (let i = 0; i < 20; i++) colony = tick(colony, 50).colony;
  assert.ok(new Set(colony.mouths.map(m => m.phase)).size > 1);
  assert.deepEqual(colony.mouths.map(m => m.bpm), shared.mouths.map(m => m.bpm));
  assert.ok(shareClock(pause(colony)).mouths.every(m => m.pulseMs === 0));
});
test('scatter breaks phase agreement even with a constant or hostile random source', () => {
  for (const random of [() => 0, () => NaN, () => Infinity]) {
    const colony = scatter(shareClock(wake()), random);
    assert.equal(new Set(colony.mouths.map(m => m.phase)).size, 7);
    assert.ok(colony.mouths.every(m => m.phase >= 0 && m.phase < 1 && m.pulseMs === 0));
  }
});
test('pause spends no budget, clears bites and resume retains the remaining active time', () => {
  let colony = tick(wake(), 1_200).colony;
  const used = colony.usedMs;
  colony = pause(shareClock(colony));
  assert.ok(colony.mouths.every(m => m.pulseMs === 0));
  assert.equal(tick(colony, 1_000_000).colony, colony);
  assert.equal(resume(colony).usedMs, used);
  assert.equal(remainingMs(colony), 60_000 - used);
  assert.equal(resume(originalColony()).running, false);
});
test('a delayed frame spends real time but cannot replay a burst of missed pulses', () => {
  const colony = wake();
  const small = tick(colony, 80);
  const delayed = tick(colony, 5_000);
  assert.equal(delayed.colony.usedMs, 5_000);
  assert.deepEqual(delayed.colony.mouths.map(m => m.phase), small.colony.mouths.map(m => m.phase));
  assert.ok(delayed.pulses.length <= colony.mouths.length);
  for (const invalid of [-10, NaN, Infinity, 'bad']) assert.deepEqual(tick(colony, invalid), { colony: { ...colony, mouths: colony.mouths }, pulses: [] });
});
test('the exact sixty-active-second boundary stops all pulses and cannot resume', () => {
  const almost = { ...shareClock(wake()), usedMs: 59_980 };
  const result = tick(almost, 5_000);
  assert.equal(result.colony.usedMs, 60_000);
  assert.equal(result.colony.running, false);
  assert.deepEqual(result.pulses, []);
  assert.ok(result.colony.mouths.every(m => m.pulseMs === 0));
  assert.equal(remainingMs(result.colony), 0);
  assert.equal(resume(result.colony).running, false);
  assert.equal(wake().mouths.length, 7);
  assert.equal(wake().usedMs, 0);
});
test('a twelve-mouth minute keeps phases and per-frame pulses bounded', () => {
  let colony = wake();
  while (colony.mouths.length < 12) colony = hatch(colony);
  for (let frame = 0; frame < 1_200; frame++) {
    const result = tick(colony, 50);
    colony = result.colony;
    assert.ok(result.pulses.length <= 12);
    assert.equal(new Set(result.pulses).size, result.pulses.length);
    assert.ok(colony.mouths.every(m => m.phase >= 0 && m.phase < 1 && m.pulseMs >= 0 && m.pulseMs <= 160));
  }
  assert.equal(colony.running, false);
  assert.equal(colony.usedMs, 60_000);
});
test('all original marks are self-contained SVG, with safe bounded variations', () => {
  assert.equal(new Set(Array.from({ length: 12 }, (_, id) => mouthSvg(id))).size, 4);
  for (const id of [...Array.from({ length: 12 }, (_, i) => i), Infinity, NaN, '<script>']) {
    const svg = mouthSvg(id);
    assert.ok(svg.startsWith('<svg '));
    assert.doesNotMatch(svg, /<script|href|<image|foreignObject|NaN|Infinity/);
    const mark = marks(id);
    assert.ok(mark.x >= 13 && mark.x <= 85 && mark.y >= 20 && mark.y <= 80);
    assert.ok(mark.mobileX >= 18 && mark.mobileX <= 82 && mark.mobileY >= 13 && mark.mobileY <= 85);
  }
});
test('audio plans bound simultaneous amplitude, pitch and smooth envelope times', () => {
  assert.equal(AUDIO.voices, 6);
  assert.ok(AUDIO.voices * AUDIO.voiceGain * AUDIO.masterGain < .07);
  for (let id = -2; id < 15; id++) {
    const plan = audioPlan(id);
    assert.ok(plan.frequency >= 160 && plan.frequency <= 440);
    assert.ok(plan.attack > 0 && plan.attack < plan.release && plan.release < plan.duration);
    assert.ok(plan.duration <= .2 && plan.gain <= .035);
  }
});
