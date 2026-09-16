import test from 'node:test';
import assert from 'node:assert/strict';
import { BOARDS, rotatePipe, traceRoute, describeResult, tileName, pipeDescription } from './parcel-bureau.mjs';

const expectedRoutes = [
  [4, 5, 9, 10, 11, 15],
  [0, 1, 5, 4, 8, 9, 13, 14, 10, 6, 7, 11, 15],
  [12, 13, 9, 8, 4, 5, 1, 2, 6, 10, 11, 7, 3],
];

for (const [number, board] of BOARDS.entries()) {
  test(`${board.title}: the authored solution delivers along the authored route`, () => {
    const before = [...board.solution];
    const result = traceRoute(board.solution, board.inlet, board.delivery);
    assert.equal(result.status, 'delivered');
    assert.deepEqual(result.route.map(({ index }) => index), expectedRoutes[number]);
    assert.deepEqual(board.solution, before, 'tracing does not mutate pipes');
    assert.match(describeResult(result, board, true), /solution was shown/);
  });

  test(`${board.title}: the initial arrangement is not already solved`, () => {
    const result = traceRoute(board.initial, board.inlet, board.delivery);
    assert.notEqual(result.status, 'delivered');
    assert.ok(result.route.length <= 16);
    assert.match(describeResult(result, board), /Not delivered/);
  });

  test(`${board.title}: ordinary clockwise rotations can recover every solution tile`, () => {
    const pipes = [...board.initial];
    for (let index = 0; index < pipes.length; index++) {
      let turns = 0;
      while (pipes[index] !== board.solution[index] && turns < 4) {
        pipes[index] = rotatePipe(pipes[index]);
        turns++;
      }
      assert.ok(turns < 4, `tile ${tileName(index)} can be solved`);
    }
    assert.equal(traceRoute(pipes, board.inlet, board.delivery).status, 'delivered');
  });

  test(`${board.title}: breaking each solution route tile never reports delivery`, () => {
    for (const index of expectedRoutes[number]) {
      const pipes = [...board.solution];
      pipes[index] = rotatePipe(pipes[index]);
      assert.notEqual(traceRoute(pipes, board.inlet, board.delivery).status, 'delivered', `rotated ${tileName(index)}`);
    }
  });
}

test('a refused inlet is reported at the first tile with no invented travelled route', () => {
  const board = BOARDS[0];
  const result = traceRoute(board.initial, board.inlet, board.delivery);
  assert.equal(result.status, 'broken');
  assert.equal(result.stop, 4);
  assert.equal(result.side, 'W');
  assert.deepEqual(result.route, []);
  assert.match(describeResult(result, board), /A2 has no west port.*inlet is blocked/);
});

test('a broken join records only traversed pipes and identifies the receiving tile', () => {
  const board = BOARDS[0];
  const pipes = [...board.solution];
  pipes[5] = 'NS';
  const result = traceRoute(pipes, board.inlet, board.delivery);
  assert.equal(result.status, 'broken');
  assert.deepEqual(result.route, [{ index: 4, entry: 'W', exit: 'E' }]);
  assert.equal(result.stop, 5);
  assert.match(describeResult(result, board), /B2 has no west port.*join breaks/);
});

test('a connected path exiting the wrong edge is not a delivery', () => {
  const board = BOARDS[0];
  const pipes = [...board.solution];
  pipes[4] = 'NW';
  pipes[0] = 'NS';
  const result = traceRoute(pipes, board.inlet, board.delivery);
  assert.equal(result.status, 'dead-end');
  assert.deepEqual(result.route.map(({ index }) => index), [4, 0]);
  assert.equal(result.side, 'N');
  assert.match(describeResult(result, board), /A1 at the north edge.*dead end/);
});

test('an artificial interior inlet into a closed ring stops after one lap', () => {
  // Boundary-entry, two-port game boards cannot enter a ring. Exercise the
  // defensive guard directly without claiming this is a playable start state.
  const pipes = ['ES', 'SW', 'NE', 'NW'];
  const result = traceRoute(pipes, { index: 0, side: 'S' }, { index: 3, side: 'E' }, 2);
  assert.equal(result.status, 'loop');
  assert.deepEqual(result.route.map(({ index }) => index), [0, 1, 3, 2]);
  assert.equal(result.stop, 0);
});

test('rotation is clockwise, preserves shape and returns after four turns', () => {
  assert.equal(rotatePipe('NE'), 'ES');
  assert.equal(rotatePipe('ES'), 'SW');
  assert.equal(rotatePipe('SW'), 'NW');
  assert.equal(rotatePipe('NW'), 'NE');
  for (const pipe of ['NE', 'ES', 'SW', 'NW', 'NS', 'EW']) {
    assert.equal(rotatePipe(pipe, 4), pipe);
    assert.equal(pipeDescription(rotatePipe(pipe)).startsWith('straight'), pipeDescription(pipe).startsWith('straight'));
  }
});

test('all authored endpoints face out of the board and all boards retain 16 two-port pipes', () => {
  for (const board of BOARDS) {
    assert.equal(board.inlet.index % 4, 0);
    assert.equal(board.inlet.side, 'W');
    assert.equal(board.delivery.index % 4, 3);
    assert.equal(board.delivery.side, 'E');
    assert.equal(board.solution.length, 16);
    assert.equal(board.initial.length, 16);
    assert.ok(board.solution.every((ports) => /^[NESW]{2}$/.test(ports) && ports[0] !== ports[1]));
  }
});
