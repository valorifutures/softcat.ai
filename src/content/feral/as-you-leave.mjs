export const START = 'vestibule';

const room = (id, name, floor, x, y, width, height, lines) => ({
  id, name, floor, plan: { x, y, width, height }, lines,
});

const definitions = [
  room('front-room', 'Front room', 'ground', 20, 80, 220, 210, [
    'Four chair dents face the empty fireplace.',
    'Afternoon light stops at the edge of the old rug.',
  ]),
  room('dining-room', 'Dining room', 'ground', 240, 80, 250, 210, [
    'The drawer under the window resists halfway.',
    'A ring from a cold glass remains in the varnish.',
  ]),
  room('stair', 'Stair', 'ground', 20, 290, 140, 270, [
    'The fourth tread answers more softly than the rest.',
    'A hand has polished the rail to the turn.',
  ]),
  room('hall', 'Hall', 'ground', 160, 290, 160, 270, [
    'A clean rectangle waits above the radiator.',
    'One runner tack stands slightly proud.',
  ]),
  room('kitchen', 'Kitchen', 'ground', 320, 290, 170, 190, [
    'One pipe under the sink is still warm.',
    'Flour gathers in the screw heads of the stripped shelf.',
  ]),
  room('pantry', 'Pantry', 'ground', 320, 480, 80, 80, [
    'Three jar circles hold their colour against the dust.',
    'The lowest hook leans under no weight.',
  ]),
  room('scullery', 'Scullery', 'ground', 400, 480, 90, 200, [
    'The tap gives one clear drop.',
    'Boot mud has dried in a crescent by the back step.',
  ]),
  room('vestibule', 'Vestibule', 'ground', 160, 560, 160, 120, [
    'The mat keeps one pale corner of the boards.',
    'A dry leaf turns when the inside door opens.',
  ]),
  room('back-bedroom', 'Back bedroom', 'upper', 510, 80, 310, 210, [
    'Dust is interrupted beneath the chair.',
    'A hairpin rests points-down between the boards.',
  ]),
  room('box-room', 'Box room', 'upper', 820, 80, 160, 300, [
    'Parcel string lies kinked in an empty drawer.',
    'One nail waits in the wall at shoulder height.',
  ]),
  room('bathroom', 'Bathroom', 'upper', 510, 290, 170, 270, [
    'The mirror is clearer where a small cabinet stood.',
    'The cold tap closes before the hot one does.',
  ]),
  room('landing', 'Landing', 'upper', 680, 290, 140, 270, [
    'Sun has thinned the wallpaper beside two closed doors.',
    'One floorboard is bare where the runner ended.',
  ]),
];

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

export const ROOMS = deepFreeze(definitions);
export const ROOM_BY_ID = deepFreeze(Object.fromEntries(ROOMS.map(item => [item.id, item])));

export const CONNECTIONS = deepFreeze([
  ['vestibule', 'hall'],
  ['hall', 'front-room'],
  ['hall', 'dining-room'],
  ['hall', 'stair'],
  ['dining-room', 'kitchen'],
  ['kitchen', 'pantry'],
  ['kitchen', 'scullery'],
  ['stair', 'landing'],
  ['landing', 'back-bedroom'],
  ['landing', 'box-room'],
  ['landing', 'bathroom'],
]);

export const EXITS = deepFreeze([
  { id: 'back-step', room: 'scullery', label: 'Back step' },
]);

const neighbours = Object.fromEntries(ROOMS.map(item => [item.id, []]));
for (const [a, b] of CONNECTIONS) {
  neighbours[a].push(b);
  neighbours[b].push(a);
}
Object.values(neighbours).forEach(list => Object.freeze(list));
deepFreeze(neighbours);

export function createWalk() {
  return { current: START, departed: [], outcome: null };
}

export function roomChoices(walk) {
  if (!walk || walk.outcome || !ROOM_BY_ID[walk.current]) return [];
  const gone = new Set(walk.departed);
  return neighbours[walk.current].filter(id => !gone.has(id));
}

export function exitChoices(walk) {
  if (!walk || walk.outcome || !ROOM_BY_ID[walk.current]) return [];
  return EXITS.filter(exit => exit.room === walk.current);
}

export function enterRoom(walk, target) {
  if (!roomChoices(walk).includes(target)) return false;
  walk.departed.push(walk.current);
  walk.current = target;
  return true;
}

export function takeExit(walk, exitId) {
  if (!exitChoices(walk).some(exit => exit.id === exitId)) return false;
  walk.departed.push(walk.current);
  walk.current = null;
  walk.outcome = 'exterior';
  return true;
}

export function isDeadEnd(walk) {
  return Boolean(walk && !walk.outcome && ROOM_BY_ID[walk.current]
    && roomChoices(walk).length === 0 && exitChoices(walk).length === 0);
}

export function closeDeadEnd(walk) {
  if (!isDeadEnd(walk)) return false;
  walk.departed.push(walk.current);
  walk.current = null;
  walk.outcome = 'dead-end';
  return true;
}

export function connectionId(a, b) {
  return [a, b].sort().join('--');
}

