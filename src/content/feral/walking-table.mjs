// An invented drawing linkage, not a force or ground-contact simulation.
export const OPENING_OFFSETS = Object.freeze([0, 180, 60, 240, 120, 300]);
export const HIPS = Object.freeze([245, 335, 425, 515, 605, 695].map((x, i) => Object.freeze({ x, y: i % 2 ? 292 : 278 })));
export const UPPER = 118;
export const LOWER = 146;
export const TURN_DURATION = 2200;
export function wrap(value) {
  return Number.isFinite(value) ? ((value % 360) + 360) % 360 : 0;
}
export function legPose(index, angle, offset = OPENING_OFFSETS[index]) {
  if (!Number.isInteger(index) || index < 0 || index >= HIPS.length) throw new RangeError('There are six legs.');
  const hip = HIPS[index];
  const t = wrap(wrap(angle) + wrap(offset)) * Math.PI / 180;
  const foot = { x: hip.x + 48 * Math.cos(t), y: hip.y + 188 + 24 * Math.sin(t) };
  const dx = foot.x - hip.x, dy = foot.y - hip.y;
  const distance = Math.hypot(dx, dy);
  const along = (UPPER ** 2 - LOWER ** 2 + distance ** 2) / (2 * distance);
  const side = Math.sqrt(Math.max(0, UPPER ** 2 - along ** 2));
  // A fixed elbow branch keeps each leg continuous through a complete turn.
  const bend = index % 2 ? -1 : 1;
  const knee = { x: hip.x + along * dx / distance - bend * side * dy / distance, y: hip.y + along * dy / distance + bend * side * dx / distance };
  const pin = { x: hip.x + 15 * Math.cos(t), y: hip.y + 15 * Math.sin(t) };
  return { hip, knee, foot, pin };
}
export function tablePose(angle, offsets = OPENING_OFFSETS) {
  return HIPS.map((_, i) => legPose(i, angle, Number.isFinite(offsets[i]) ? offsets[i] : OPENING_OFFSETS[i]));
}
export function revolutionAt(start, elapsed, duration = TURN_DURATION) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : TURN_DURATION;
  const fraction = Math.min(1, Math.max(0, Number.isFinite(elapsed) ? elapsed / safeDuration : 0));
  return { angle: wrap(wrap(start) + 360 * fraction), done: fraction === 1 };
}
export function pointerDelta(previous, next) {
  if (!Number.isFinite(previous) || !Number.isFinite(next)) return 0;
  return ((next - previous + 540) % 360) - 180;
}
