// The whole postal system: three authored boards and a bounded, pure route walk.
export const SIDES = ['N', 'E', 'S', 'W'];
export const SIDE_NAMES = { N: 'north', E: 'east', S: 'south', W: 'west' };
const OPPOSITE = { N: 'S', E: 'W', S: 'N', W: 'E' };

export function rotatePipe(ports, turns = 1) {
  return [...ports].map((side) => SIDES[(SIDES.indexOf(side) + turns % 4 + 4) % 4])
    .sort((a, b) => SIDES.indexOf(a) - SIDES.indexOf(b)).join('');
}

export function tileName(index, size = 4) {
  return `${String.fromCharCode(65 + index % size)}${Math.floor(index / size) + 1}`;
}

export function pipeDescription(ports) {
  const shape = (ports === 'NS' || ports === 'EW') ? 'straight' : 'elbow';
  return `${shape}, ports ${[...ports].map((side) => SIDE_NAMES[side]).join(' and ')}`;
}

function makeBoard(board) {
  const solution = board.solution.map((ports) => rotatePipe(ports, 0));
  const initial = solution.map((ports, index) => rotatePipe(ports, board.scramble[index]));
  return Object.freeze({ ...board, solution: Object.freeze(solution), initial: Object.freeze(initial) });
}

export const BOARDS = Object.freeze([
  makeBoard({
    id: 'thursday', title: 'One spare Thursday', address: 'For a week that ran out of room.',
    inlet: { index: 4, side: 'W' }, delivery: { index: 15, side: 'E' },
    solution: ['NE', 'NS', 'ES', 'EW', 'EW', 'SW', 'NE', 'NS', 'NS', 'NE', 'EW', 'SW', 'ES', 'EW', 'WN', 'NE'],
    scramble: [1, 0, 2, 1, 1, 1, 3, 0, 1, 2, 1, 1, 0, 1, 2, 2],
  }),
  makeBoard({
    id: 'rain', title: 'The sound before rain', address: 'Handle quietly. The sky is listening.',
    inlet: { index: 0, side: 'W' }, delivery: { index: 15, side: 'E' },
    solution: ['EW', 'SW', 'NE', 'EW', 'ES', 'WN', 'ES', 'SW', 'NE', 'SW', 'NS', 'NS', 'NS', 'NE', 'WN', 'NE'],
    scramble: [0, 1, 2, 1, 2, 2, 1, 3, 3, 1, 1, 1, 0, 1, 2, 3],
  }),
  makeBoard({
    id: 'room', title: 'A little more room', address: 'Do not measure the parcel from inside.',
    inlet: { index: 12, side: 'W' }, delivery: { index: 3, side: 'E' },
    solution: ['EW', 'ES', 'SW', 'ES', 'ES', 'WN', 'NS', 'NS', 'NE', 'SW', 'NE', 'WN', 'EW', 'WN', 'NE', 'NS'],
    scramble: [1, 2, 1, 2, 1, 3, 1, 0, 2, 1, 2, 1, 0, 2, 3, 1],
  }),
]);

/** Walk connected two-port pipes. An interior inlet is also supported for tests. */
export function traceRoute(pipes, inlet, delivery, size = 4) {
  const route = [];
  const visited = new Set();
  let index = inlet.index;
  let entry = inlet.side;

  // A connected two-port board entered from its boundary cannot form a loop.
  // The visited guard still bounds the walk if a future board changes that rule.
  while (route.length <= pipes.length) {
    if (visited.has(index)) return { status: 'loop', route, stop: index, side: entry };
    const ports = pipes[index];
    if (!ports || ports.length !== 2 || !ports.includes(entry)) {
      return { status: 'broken', route, stop: index, side: entry };
    }
    visited.add(index);
    const exit = [...ports].find((side) => side !== entry);
    route.push({ index, entry, exit });
    const row = Math.floor(index / size);
    const col = index % size;
    const outside = (exit === 'N' && row === 0) || (exit === 'S' && row === size - 1)
      || (exit === 'W' && col === 0) || (exit === 'E' && col === size - 1);
    if (outside) {
      return { status: index === delivery.index && exit === delivery.side ? 'delivered' : 'dead-end', route, stop: index, side: exit };
    }
    index += { N: -size, E: 1, S: size, W: -1 }[exit];
    entry = OPPOSITE[exit];
  }
  return { status: 'loop', route, stop: index, side: entry };
}

export function describeResult(result, board, assisted = false) {
  const place = tileName(result.stop);
  const side = SIDE_NAMES[result.side];
  if (result.status === 'delivered') {
    return `Delivered: ${board.title.toLowerCase()}. ${result.route.length} pipes connected the inlet to the delivery box at ${place}, ${side} edge.${assisted ? ' The solution was shown for this attempt.' : ''}`;
  }
  if (result.status === 'broken') {
    return `Not delivered. ${place} has no ${side} port to receive the parcel. ${result.route.length ? 'The join breaks here.' : 'The inlet is blocked.'} Rotate the pipes and try again.`;
  }
  if (result.status === 'dead-end') {
    return `Not delivered. The route leaves ${place} at the ${side} edge, where there is no delivery box. This is a dead end. Rotate the pipes and try again.`;
  }
  return `Not delivered. The route returns to ${place} through its ${side} port. This is a loop, so the parcel has stopped here. Rotate the pipes and try again.`;
}

export function pipePath(ports) {
  const points = { N: '50 0', E: '100 50', S: '50 100', W: '0 50' };
  return `M${points[ports[0]]} L50 50 L${points[ports[1]]}`;
}
