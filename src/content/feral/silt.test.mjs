import test from 'node:test';
import assert from 'node:assert/strict';
import { SIZE, DIRECTIONS, deposit, canMove, setGravity, step, dig, digLine } from './silt.mjs';

const colours = room => Array.from({ length: 7 }, (_, colour) => room.cells.filter(value => value === colour).length);
const grains = room => room.cells.reduce((sum, value) => sum + (value > 0), 0);
function empty(width = 9, height = 9) {
  const room = deposit(width, height);
  room.cells.fill(0);
  room.remaining = room.initial = room.removed = 0;
  room.stable = true;
  return room;
}
function place(room, x, y, colour = 1) { room.cells[y * room.width + x] = colour; room.initial++; room.remaining++; room.stable = !canMove(room); }
function settle(room) {
  // Every move increases a grain's coordinate along gravity by one. That
  // finite potential bounds a complete settle, even on an adversarial pile.
  const budget = room.remaining * Math.max(room.width, room.height) + 1;
  let iterations = 0;
  while (!room.stable && iterations <= budget) { step(room); iterations++; }
  assert.ok(room.stable, `did not settle after ${budget} sweeps`);
  assert.equal(canMove(room), false);
  assert.deepEqual(step(room), { moved: 0, stable: true });
  return iterations;
}
function potential(room) {
  const pull = DIRECTIONS[room.direction];
  let total = 0;
  for (let y = 0; y < room.height; y++) for (let x = 0; x < room.width; x++) {
    if (room.cells[y * room.width + x]) total += x * pull.x + y * pull.y;
  }
  return total;
}

test('the original coloured strata are finite, completely counted and at rest', () => {
  const room = deposit();
  assert.equal(room.cells.length, SIZE.width * SIZE.height);
  assert.equal(room.remaining, 10880);
  assert.equal(room.initial, grains(room));
  assert.equal(room.removed, 0);
  assert.equal(room.direction, 'down');
  assert.equal(room.stable, true);
  assert.equal(canMove(room), false);
  assert.deepEqual(step(room), { moved: 0, stable: true });
  for (let y = 0; y < room.height; y++) {
    const row = [...room.cells.slice(y * room.width, (y + 1) * room.width)];
    assert.ok(y < 32 ? row.every(value => value === 0) : row.every(value => value > 0));
  }
  assert.ok(colours(room).slice(1).every(count => count > 0));
});

test('each direction moves a single grain one cell per sweep towards its actual receiving wall', () => {
  for (const [direction, pull] of Object.entries(DIRECTIONS)) {
    const room = empty();
    place(room, 4, 4);
    setGravity(room, direction);
    assert.deepEqual(step(room), { moved: 1, stable: false });
    assert.equal(room.cells[(4 + pull.y) * room.width + 4 + pull.x], 1);
    assert.equal(grains(room), 1);
    settle(room);
    const x = pull.x > 0 ? 8 : pull.x < 0 ? 0 : 4;
    const y = pull.y > 0 ? 8 : pull.y < 0 ? 0 : 4;
    assert.equal(room.cells[y * room.width + x], 1);
    assert.equal(room.remaining, 1);
  }
});

test('blocked grains really slide diagonally into a void and never through an occupied destination', () => {
  const room = empty(5, 4);
  place(room, 2, 2, 1);
  place(room, 2, 3, 2);
  step(room);
  assert.equal(room.cells[3 * 5 + 2], 2);
  assert.equal(room.cells[3 * 5 + 1], 1);
  assert.equal(room.cells[2 * 5 + 2], 0);
  assert.equal(grains(room), 2);
  assert.equal(room.stable, true);
});

test('all four directions preserve each grain colour and stop without leaking past a boundary', () => {
  const room = deposit(31, 21);
  const expected = colours(room).slice(1);
  const originalCount = room.remaining;
  for (const direction of ['left', 'up', 'right', 'down', 'right', 'up']) {
    setGravity(room, direction);
    let limit = room.remaining * Math.max(room.width, room.height) + 1;
    while (!room.stable && limit-- > 0) {
      const before = potential(room);
      const { moved } = step(room);
      assert.equal(potential(room) - before, moved);
      assert.equal(room.remaining, originalCount);
      assert.equal(grains(room), originalCount);
      assert.deepEqual(colours(room).slice(1), expected);
    }
    assert.equal(room.stable, true);
    assert.equal(canMove(room), false);
    assert.equal(room.cells.length, 31 * 21);
    assert.equal(room.removed, 0);
  }
});

test('an interior scoop removes a circular hole and the ground fills that actual hole', () => {
  const room = deposit(20, 20);
  const before = room.remaining;
  const removed = dig(room, 10, 14, 2);
  assert.equal(removed, 13);
  assert.equal(room.cells[14 * 20 + 10], 0);
  assert.equal(room.remaining, before - 13);
  assert.equal(room.removed, 13);
  assert.equal(room.stable, false);
  const hole = room.cells.slice();
  assert.ok(settle(room) > 0);
  assert.notDeepEqual(room.cells, hole);
  assert.equal(grains(room), before - 13);
  assert.equal(room.initial, room.remaining + room.removed);
});

test('scooping empty space, repeated cuts and out-of-bounds input never invent removal', () => {
  const room = deposit(12, 12);
  assert.equal(dig(room, 4, 0, 1), 0);
  const first = dig(room, 5, 7, 1);
  assert.equal(first, 5);
  assert.equal(dig(room, 5, 7, 1), 0);
  const expected = room.cells.slice();
  for (const [x, y, radius] of [[-1, 7, 2], [12, 7, 2], [5, 12, 2], [NaN, 7, 2], [5, Infinity, 2], [5, 7, Infinity]]) {
    assert.equal(dig(room, x, y, radius), 0);
  }
  assert.deepEqual(room.cells, expected);
  assert.equal(room.removed, first);
  assert.equal(room.initial, room.remaining + room.removed);
});

test('a fast stroke makes one continuous hole, clips at walls and counts overlapping scoops once', () => {
  const room = deposit(30, 20);
  const removed = digLine(room, { x: 0, y: 13 }, { x: 29, y: 13 }, 1);
  assert.equal(removed, 90);
  for (let y = 12; y <= 14; y++) assert.ok(room.cells.slice(y * 30, (y + 1) * 30).every(value => value === 0));
  assert.equal(digLine(room, { x: 0, y: 13 }, { x: 29, y: 13 }, 1), 0);
  assert.equal(room.removed, removed);
  assert.equal(grains(room), room.remaining);
  const before = room.cells.slice();
  assert.equal(digLine(room, { x: 0, y: 0 }, { x: 1000000000, y: 9 }, 1), 0);
  assert.equal(digLine(room, { x: NaN, y: 0 }, { x: 0, y: 9 }, 1), 0);
  assert.deepEqual(room.cells, before);
});

test('digging all material produces a stable empty chamber; reset reconstructs the original independently', () => {
  const room = deposit(16, 16);
  const original = room.cells.slice();
  for (let y = 0; y < room.height; y += 3) for (let x = 0; x < room.width; x += 3) dig(room, x, y, 3);
  assert.equal(room.remaining, 0);
  assert.equal(room.removed, room.initial);
  assert.equal(grains(room), 0);
  for (const direction of Object.keys(DIRECTIONS)) {
    setGravity(room, direction);
    assert.equal(room.stable, true);
    assert.equal(step(room).moved, 0);
  }
  const restored = deposit(16, 16);
  assert.deepEqual(restored.cells, original);
  assert.equal(restored.removed, 0);
  assert.equal(restored.direction, 'down');
  assert.equal(restored.stable, true);
  assert.notEqual(restored.cells, room.cells);
});

test('boundary grains cannot wrap to another row, and invalid gravity keeps the existing world', () => {
  for (const [direction, x, y] of [['down', 4, 4], ['left', 0, 2], ['up', 0, 0], ['right', 4, 2]]) {
    const room = empty(5, 5);
    place(room, x, y);
    setGravity(room, direction);
    const before = room.cells.slice();
    assert.equal(step(room).moved, 0);
    assert.deepEqual(room.cells, before);
    assert.equal(setGravity(room, '__proto__'), false);
    assert.equal(setGravity(room, 'downward'), false);
    assert.equal(room.direction, direction);
    assert.deepEqual(room.cells, before);
  }
});

test('the full-sized, excavated chamber settles through a four-wall tour with exact conservation', () => {
  const room = deposit();
  digLine(room, { x: 10, y: 82 }, { x: 141, y: 40 }, 5);
  dig(room, 80, 80, 12);
  const expected = colours(room).slice(1);
  for (const direction of ['down', 'left', 'up', 'right', 'down']) {
    setGravity(room, direction);
    settle(room);
    assert.deepEqual(colours(room).slice(1), expected);
    assert.equal(room.initial, room.remaining + room.removed);
    assert.equal(grains(room), room.remaining);
  }
});
