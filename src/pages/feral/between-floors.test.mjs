import test from 'node:test';
import assert from 'node:assert/strict';
import { DOOR_MS, FLOOR_ORDER, FLOORS, STEP_MS, floorById, liftPlan, markVisited } from '../../content/feral/between-floors.mjs';

test('the eight inadmissible storeys are unique and retain their authored labels', () => {
  assert.equal(FLOORS.length, 8);
  assert.deepEqual(FLOORS.map((floor) => floor.id), FLOOR_ORDER);
  assert.equal(new Set(FLOORS.map((floor) => floor.name)).size, 8);
  assert.equal(floorById('H')?.label, '½');
  assert.equal(floorById('2')?.name, 'Rain kept indoors');
});

test('an upward ride visits only adjacent indicators and ends at its chosen floor', () => {
  const plan = liftPlan('B', '5');
  assert.deepEqual(plan.path, FLOOR_ORDER);
  assert.equal(plan.stepCount, 7);
  assert.equal(plan.durationMs, (DOOR_MS * 2) + (7 * STEP_MS));
  assert.ok(plan.durationMs < 3000);
});

test('a downward ride is the exact reverse and remains finite', () => {
  const plan = liftPlan('4', 'G');
  assert.deepEqual(plan.path, ['4', '3', '2', 'H', '1', 'G']);
  assert.equal(plan.durationMs, (DOOR_MS * 2) + (5 * STEP_MS));
});

test('choosing the present landing still closes and opens the stage doors once', () => {
  assert.deepEqual(liftPlan('3', '3'), { from: '3', to: '3', path: ['3'], stepCount: 0, durationMs: DOOR_MS * 2 });
});

test('reduced motion resolves the same authored path with no timed ride', () => {
  const ordinary = liftPlan('G', '5');
  const reduced = liftPlan('G', '5', { reducedMotion: true });
  assert.deepEqual(reduced.path, ordinary.path);
  assert.equal(reduced.durationMs, 0);
});

test('visits are local, unique and immutable while hostile floors fail closed', () => {
  const opening = ['G'];
  const visited = markVisited(opening, '2');
  assert.deepEqual(visited, ['G', '2']);
  assert.deepEqual(markVisited(visited, 'G'), ['G', '2']);
  assert.deepEqual(opening, ['G']);
  assert.throws(() => markVisited(visited, '9'), /Unknown/);
  assert.throws(() => liftPlan('roof', 'G'), /Unknown/);
});
