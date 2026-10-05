// Original clocks and vector marks for BRUX. No external data or dependency.
export const LIMITS = Object.freeze({ mouths: 12, initial: 7, minPace: 48, maxPace: 144, sessionMs: 60_000, stepMs: 80, pulseMs: 160 });
export const AUDIO = Object.freeze({ voices: 6, voiceGain: 0.035, masterGain: 0.3, attack: 0.008, release: 0.14, duration: 0.17 });
const PACES = [57, 71, 89, 106, 127, 63, 97, 113, 79, 139, 53, 101];
const PHASES = [.08, .44, .77, .25, .60, .91, .37, .13, .67, .32, .84, .51];
const COLOURS = ['#e8ff62', '#ff91be', '#eee9dc', '#e8ff62', '#eee9dc', '#ff91be', '#e8ff62', '#ff91be', '#eee9dc', '#e8ff62', '#ff91be', '#eee9dc'];
const SLOTS = [0, 2, 3, 5, 6, 8, 11, 1, 4, 7, 9, 10];
const PITCHES = [164.81, 220, 293.66, 392, 196, 261.63, 349.23, 440, 174.61, 233.08, 311.13, 415.3];
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const clampPace = value => Math.round(clamp(finite(value, 90), LIMITS.minPace, LIMITS.maxPace));
const mouth = id => ({ id, bpm: PACES[id], phase: PHASES[id], pulseMs: 0 });

export function originalColony() {
  return { mouths: Array.from({ length: LIMITS.initial }, (_, id) => mouth(id)), usedMs: 0, running: false, started: false };
}
export function wake(colony = originalColony()) {
  return { ...colony, mouths: colony.mouths.map(item => ({ ...item, pulseMs: 0 })), usedMs: 0, running: true, started: true };
}
export function remainingMs(colony) { return Math.max(0, LIMITS.sessionMs - colony.usedMs); }
export function pause(colony) {
  return { ...colony, running: false, mouths: colony.mouths.map(item => ({ ...item, pulseMs: 0 })) };
}
export function resume(colony) {
  return { ...colony, running: colony.started && remainingMs(colony) > 0 };
}
export function setPace(colony, id, value) {
  return { ...colony, mouths: colony.mouths.map(item => item.id === id ? { ...item, bpm: clampPace(value) } : item) };
}
export function hatch(colony) {
  if (colony.mouths.length >= LIMITS.mouths) return colony;
  return { ...colony, mouths: [...colony.mouths, mouth(colony.mouths.length)] };
}
export function shareClock(colony) {
  return { ...colony, mouths: colony.mouths.map(item => ({ ...item, phase: 0, pulseMs: colony.running ? LIMITS.pulseMs : 0 })) };
}
export function scatter(colony, random = Math.random) {
  return { ...colony, mouths: colony.mouths.map((item, index) => ({ ...item, phase: (index * .381966 + clamp(finite(random(), .5), 0, 1) * .24) % 1, pulseMs: 0 })) };
}

export function tick(colony, elapsedMs) {
  if (!colony.running) return { colony, pulses: [] };
  const elapsed = clamp(finite(elapsedMs, 0), 0, remainingMs(colony));
  const usedMs = colony.usedMs + elapsed;
  // Spend the real active time but never replay a delayed frame's missed notes.
  const dt = Math.min(elapsed, LIMITS.stepMs) / 1000;
  const pulses = [];
  const mouths = colony.mouths.map((item, index, all) => {
    const neighbour = all[(index + 1) % all.length];
    const tug = Math.sin((neighbour.phase - item.phase) * Math.PI * 2) * .035;
    const phase = item.phase + (item.bpm / 60 + tug) * dt;
    const pulsed = phase >= 1;
    if (pulsed) pulses.push(item.id);
    return { ...item, phase: phase % 1, pulseMs: pulsed ? LIMITS.pulseMs : Math.max(0, item.pulseMs - elapsed) };
  });
  if (usedMs >= LIMITS.sessionMs) {
    return { colony: { ...colony, usedMs: LIMITS.sessionMs, running: false, mouths: mouths.map(item => ({ ...item, pulseMs: 0 })) }, pulses: [] };
  }
  return { colony: { ...colony, usedMs, mouths }, pulses };
}

export function marks(id) {
  const safeId = clamp(Math.round(finite(id, 0)), 0, LIMITS.mouths - 1);
  const slot = SLOTS[safeId];
  return {
    colour: COLOURS[safeId], x: 13 + (slot % 4) * 24, y: 20 + Math.floor(slot / 4) * 30,
    mobileX: 18 + (safeId % 3) * 32, mobileY: 13 + Math.floor(safeId / 3) * 24,
    angle: [-11, 8, -5, 13, -8, 6, -14, 4, 10, -6, 12, -3][safeId],
    scale: [1.02, 1.15, .87, 1.08, .95, 1.17, 1, .94, 1.04, .92, 1.03, .98][safeId],
  };
}
export function mouthSvg(id) {
  const safeId = clamp(Math.round(finite(id, 0)), 0, LIMITS.mouths - 1);
  const bend = safeId % 4;
  const top = Array.from({ length: 5 }, (_, i) => {
    const x = 21 + i * 25;
    return `M${x} ${31 + (i + bend) % 3 * 3}l${5 + (i + bend) % 4} ${19 - (i + bend) % 3 * 3}l${11 + i % 3} -${17 + i % 2 * 3}z`;
  }).join('');
  const bottom = Array.from({ length: 5 }, (_, i) => {
    const x = 24 + i * 25;
    return `M${x} ${70 - (i + bend) % 3 * 3}l${7 + i % 3} -${16 + (i + bend) % 4}l${10 + i % 2} ${15 + (i + bend) % 3}z`;
  }).join('');
  return `<svg viewBox="0 0 160 100" aria-hidden="true" focusable="false"><g class="upper"><path class="lip" d="M9 43Q19 ${12 + bend * 3} 78 ${22 - bend}Q139 ${10 + bend * 2} 151 40"/><path d="${top}"/></g><g class="lower"><path class="lip" d="M11 63Q23 ${88 - bend} 83 ${78 + bend}Q137 ${92 - bend * 2} 149 62"/><path d="${bottom}"/></g></svg>`;
}
export function audioPlan(id) {
  const safeId = clamp(Math.round(finite(id, 0)), 0, LIMITS.mouths - 1);
  return { frequency: PITCHES[safeId], gain: AUDIO.voiceGain, attack: AUDIO.attack, release: AUDIO.release, duration: AUDIO.duration };
}
