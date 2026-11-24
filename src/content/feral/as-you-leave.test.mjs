import test from 'node:test';
import assert from 'node:assert/strict';
import {
  START, ROOMS, ROOM_BY_ID, CONNECTIONS, EXITS, createWalk, roomChoices,
  exitChoices, enterRoom, takeExit, isDeadEnd, closeDeadEnd, connectionId,
} from './as-you-leave.mjs';

test('the authored house has twelve unique named rooms and one fixed valid graph', () => {
  assert.equal(ROOMS.length, 12);
  assert.equal(new Set(ROOMS.map(room => room.id)).size, 12);
  assert.equal(new Set(ROOMS.map(room => room.name)).size, 12);
  assert.ok(ROOM_BY_ID[START]);
  assert.deepEqual(EXITS, [{ id: 'back-step', room: 'scullery', label: 'Back step' }]);
  const edges = new Set();
  for (const [a, b] of CONNECTIONS) {
    assert.ok(ROOM_BY_ID[a] && ROOM_BY_ID[b]);
    assert.notEqual(a, b);
    const id = connectionId(a, b);
    assert.equal(edges.has(id), false);
    edges.add(id);
  }
  for (const room of ROOMS) {
    assert.equal(room.lines.length, 2);
    assert.ok(room.lines.every(line => typeof line === 'string' && line.endsWith('.')));
    assert.ok(Object.values(room.plan).every(Number.isFinite));
  }
});

test('leaving destroys the previous room and prevents recovery during the walk', () => {
  const walk = createWalk();
  assert.deepEqual(roomChoices(walk), ['hall']);
  assert.equal(enterRoom(walk, 'hall'), true);
  assert.deepEqual(walk.departed, ['vestibule']);
  assert.equal(roomChoices(walk).includes('vestibule'), false);
  assert.equal(enterRoom(walk, 'vestibule'), false);
  assert.equal(enterRoom(walk, 'dining-room'), true);
  assert.equal(roomChoices(walk).includes('hall'), false);
});

function outcomes(walk, route = [walk.current], found = []) {
  for (const exit of exitChoices(walk)) found.push({ kind: 'exterior', route: [...route, exit.id] });
  const choices = roomChoices(walk);
  if (choices.length === 0 && exitChoices(walk).length === 0) found.push({ kind: 'dead-end', route });
  for (const target of choices) {
    const next = structuredClone(walk);
    assert.equal(enterRoom(next, target), true);
    outcomes(next, [...route, target], found);
  }
  return found;
}

test('every possible route excludes most of the house, with both exterior and dead-end endings', () => {
  const found = outcomes(createWalk());
  assert.ok(found.some(result => result.kind === 'exterior'));
  assert.ok(found.some(result => result.kind === 'dead-end'));
  const longestRooms = Math.max(...found.map(result => result.route.filter(id => ROOM_BY_ID[id]).length));
  assert.equal(longestRooms, 5);
  assert.ok(longestRooms < ROOMS.length);
  assert.ok(found.some(result => result.route.join('/') === 'vestibule/hall/dining-room/kitchen/scullery/back-step'));
  assert.ok(found.some(result => result.route.join('/') === 'vestibule/hall/stair/landing/bathroom'));
});

test('dead ends and the exterior close the final occupied room exactly once', () => {
  const dead = createWalk();
  for (const id of ['hall', 'front-room']) assert.equal(enterRoom(dead, id), true);
  assert.equal(isDeadEnd(dead), true);
  assert.equal(closeDeadEnd(dead), true);
  assert.equal(dead.current, null);
  assert.equal(dead.outcome, 'dead-end');
  assert.deepEqual(dead.departed, ['vestibule', 'hall', 'front-room']);
  assert.equal(closeDeadEnd(dead), false);

  const outside = createWalk();
  for (const id of ['hall', 'dining-room', 'kitchen', 'scullery']) assert.equal(enterRoom(outside, id), true);
  assert.deepEqual(exitChoices(outside).map(exit => exit.id), ['back-step']);
  assert.equal(takeExit(outside, 'back-step'), true);
  assert.equal(outside.outcome, 'exterior');
  assert.deepEqual(outside.departed, ['vestibule', 'hall', 'dining-room', 'kitchen', 'scullery']);
  assert.equal(takeExit(outside, 'back-step'), false);
});

test('hostile transitions do nothing and a fresh walk restores the complete house', () => {
  const walk = createWalk();
  const before = structuredClone(walk);
  for (const target of ['front-room', 'back-step', '', null, undefined]) {
    assert.equal(enterRoom(walk, target), false);
    assert.equal(takeExit(walk, target), false);
  }
  assert.equal(closeDeadEnd(walk), false);
  assert.deepEqual(walk, before);
  enterRoom(walk, 'hall');
  assert.deepEqual(createWalk(), { current: START, departed: [], outcome: null });
});
