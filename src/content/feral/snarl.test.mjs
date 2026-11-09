import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARD, KNOTS, NODE_CLEARANCE, CORD_CLEARANCE, segmentRelation, distanceToCord, inspect, createGame, chooseKnot, selectEyelet, moveEyelet, resetKnot, showArrangement, progress } from './snarl.mjs';

test('three authored starts are tangled and every retained graph has a valid known arrangement', () => {
  assert.deepEqual(KNOTS.map(knot => knot.initial.length), [6, 8, 10]);
  assert.deepEqual(KNOTS.map(knot => inspect(knot.initial, knot.edges).total), [8, 19, 34]);
  for (const knot of KNOTS) {
    assert.ok(inspect(knot.initial, knot.edges).cordPairs.length > 0);
    assert.equal(inspect(knot.solution, knot.edges).clear, true);
    const named = new Set(knot.edges.flat());
    assert.equal(named.size, knot.initial.length);
    for (const [a, b] of knot.edges) { assert.ok(a !== b); assert.ok(named.has(a) && named.has(b)); }
    for (const point of [...knot.initial, ...knot.solution]) {
      assert.ok(point.x >= BOARD.inset && point.x <= BOARD.width - BOARD.inset);
      assert.ok(point.y >= BOARD.inset && point.y <= BOARD.height - BOARD.inset);
    }
  }
});

test('cord geometry distinguishes proper crossing, contact, positive overlap and separated parallel lines', () => {
  const p = (x, y) => ({ x, y });
  assert.equal(segmentRelation(p(0, 0), p(100, 100), p(0, 100), p(100, 0)), 'crossing');
  assert.equal(segmentRelation(p(0, 0), p(100, 0), p(100, 0), p(200, 0)), 'touch');
  assert.equal(segmentRelation(p(0, 0), p(100, 0), p(50, 0), p(150, 0)), 'overlap');
  assert.equal(segmentRelation(p(0, 0), p(0, 100), p(0, 75), p(0, 200)), 'overlap');
  assert.equal(segmentRelation(p(0, 0), p(100, 0), p(25, 20), p(75, 20)), 'none');
  assert.equal(segmentRelation(p(0, 0), p(40, 0), p(60, 0), p(100, 0)), 'none');
  assert.equal(segmentRelation(p(0, 0), p(100, 0), p(50, 0), p(50, 100)), 'touch');
});

test('ordinary shared endpoints and straight-through joins are allowed, shared-end cord overlap is rejected', () => {
  const points = [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 300, y: 300 }];
  assert.equal(inspect(points, [[0, 1], [1, 2]]).clear, true);
  const straight = [{ x: 100, y: 100 }, { x: 300, y: 100 }, { x: 500, y: 100 }];
  assert.equal(inspect(straight, [[0, 1], [1, 2]]).clear, true);
  const overlap = inspect(straight, [[0, 1], [0, 2]]);
  assert.equal(overlap.clear, false);
  assert.equal(overlap.cordPairs[0].relation, 'overlap');
  assert.ok(overlap.blockedEyelets.some(issue => issue.eyelet === 1));
});

test('collapsing all eyelets or laying an unrelated eyelet on a cord cannot manufacture completion', () => {
  for (const knot of KNOTS) {
    const report = inspect(knot.initial.map(() => ({ x: 500, y: 340 })), knot.edges);
    assert.equal(report.clear, false);
    assert.equal(report.closeEyelets.length, knot.initial.length * (knot.initial.length - 1) / 2);
  }
  const report = inspect([{ x: 100, y: 100 }, { x: 500, y: 100 }, { x: 300, y: 100 }], [[0, 1]]);
  assert.equal(report.cordPairs.length, 0);
  assert.equal(report.closeEyelets.length, 0);
  assert.equal(report.blockedEyelets.length, 1);
  assert.equal(report.clear, false);
});

test('clearance includes cord width and eyelet space, with exact boundaries treated consistently', () => {
  const a = { x: 100, y: 100 }, b = { x: 500, y: 100 };
  assert.equal(distanceToCord({ x: 300, y: 150 }, a, b), 50);
  assert.equal(distanceToCord({ x: 50, y: 100 }, a, b), 50);
  assert.equal(distanceToCord(a, a, a), 0);
  assert.equal(inspect([a, b, { x: 300, y: 100 + CORD_CLEARANCE }], [[0, 1]]).clear, true);
  assert.equal(inspect([a, b, { x: 300, y: 100 + CORD_CLEARANCE - 1 }], [[0, 1]]).clear, false);
  assert.equal(inspect([a, { x: 100 + NODE_CLEARANCE, y: 100 }], []).clear, true);
  assert.equal(inspect([a, { x: 100 + NODE_CLEARANCE - 1, y: 100 }], []).clear, false);
});

test('crossing classification survives rotation and reflection of the same arrangement', () => {
  for (const knot of KNOTS) {
    const initial = inspect(knot.initial, knot.edges);
    const rotate = point => ({ x: BOARD.height - point.y, y: point.x });
    const reflect = point => ({ x: BOARD.width - point.x, y: point.y });
    for (const transform of [rotate, reflect]) {
      const report = inspect(knot.initial.map(transform), knot.edges);
      assert.equal(report.total, initial.total);
      assert.equal(report.cordPairs.length, initial.cordPairs.length);
      assert.equal(report.blockedEyelets.length, initial.blockedEyelets.length);
      assert.equal(inspect(knot.solution.map(transform), knot.edges).clear, true);
    }
  }
});

test('bad geometry cannot return a false clear result', () => {
  assert.throws(() => inspect([{ x: NaN, y: 0 }], []), /finite/);
  assert.throws(() => inspect([{ x: 0, y: Infinity }], []), /finite/);
  assert.throws(() => inspect([{ x: 0, y: 0 }], [[0, 1]]), /existing/);
  assert.throws(() => inspect([{ x: 0, y: 0 }], [[0, 0]]), /different/);
});

test('movement is bounded and invalid input leaves the existing world unchanged', () => {
  const game = createGame();
  assert.equal(moveEyelet(game, 0, -10000, 10000), true);
  assert.deepEqual(game.knots[0].points[0], { x: BOARD.inset, y: BOARD.height - BOARD.inset });
  const before = structuredClone(game);
  for (const [index, x, y] of [[-1, 0, 0], [6, 0, 0], [0, NaN, 0], [0, 0, Infinity]]) assert.equal(moveEyelet(game, index, x, y), false);
  assert.equal(chooseKnot(game, 3), false);
  assert.equal(chooseKnot(game, -1), false);
  assert.equal(selectEyelet(game, 6), false);
  assert.deepEqual(game, before);
});

test('selection, switching and reset preserve separate attempts without mutating authored geometry', () => {
  const original = structuredClone(KNOTS);
  const game = createGame();
  selectEyelet(game, 4); moveEyelet(game, 4, 100, 200);
  chooseKnot(game, 2); selectEyelet(game, 9); moveEyelet(game, 9, 700, 600);
  chooseKnot(game, 0);
  assert.equal(game.knots[0].selected, 4);
  assert.deepEqual(game.knots[0].points[4], { x: 100, y: 200 });
  resetKnot(game);
  assert.deepEqual(game.knots[0].points, KNOTS[0].initial);
  assert.equal(game.knots[0].selected, 0);
  assert.deepEqual(game.knots[2].points[9], { x: 700, y: 600 });
  assert.deepEqual(KNOTS, original);
});

test('all three must currently be clear by hand; revealing remains disclosed after reset or more movement', () => {
  const game = createGame();
  assert.equal(progress(game).allByHand, false);
  for (let index = 0; index < KNOTS.length; index++) {
    chooseKnot(game, index);
    KNOTS[index].solution.forEach((point, eyelet) => moveEyelet(game, eyelet, point.x, point.y));
  }
  assert.deepEqual(progress(game).byHand, [true, true, true]);
  assert.equal(progress(game).allByHand, true);
  moveEyelet(game, 0, game.knots[2].points[1].x, game.knots[2].points[1].y);
  assert.equal(progress(game).allByHand, false);
  showArrangement(game);
  assert.equal(progress(game).reports[2].clear, true);
  assert.equal(progress(game).byHand[2], false);
  resetKnot(game);
  assert.equal(game.knots[2].shown, true);
  KNOTS[2].solution.forEach((point, eyelet) => moveEyelet(game, eyelet, point.x, point.y));
  assert.equal(progress(game).allByHand, false);
  assert.deepEqual(progress(game).byHand, [true, true, false]);
});
