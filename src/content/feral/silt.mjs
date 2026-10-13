export const SIZE = Object.freeze({ width: 160, height: 100 });
export const COLOURS = Object.freeze(['#202d79', '#f6af96', '#f2a38c', '#d7a245', '#c99337', '#c8def0', '#b8d1e9']);
export const DIRECTIONS = Object.freeze({
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  up: Object.freeze({ x: 0, y: -1 }),
  right: Object.freeze({ x: 1, y: 0 }),
});

function size(value, fallback) {
  return Number.isInteger(value) && value >= 2 && value <= 220 ? value : fallback;
}

export function deposit(width = SIZE.width, height = SIZE.height) {
  width = size(width, SIZE.width);
  height = size(height, SIZE.height);
  const cells = new Uint8Array(width * height);
  const top = Math.floor(height * .32);
  const seamA = Math.floor(height * .55);
  const seamB = Math.floor(height * .76);
  for (let y = top; y < height; y++) {
    const layer = y < seamA ? 1 : y < seamB ? 3 : 5;
    for (let x = 0; x < width; x++) cells[y * width + x] = layer + ((x * 37 + y * 17 + x * y) % 11 < 3 ? 1 : 0);
  }
  return { width, height, cells, direction: 'down', initial: width * (height - top), remaining: width * (height - top), removed: 0, sweeps: 0, stable: true };
}

function index(room, x, y) {
  return x >= 0 && y >= 0 && x < room.width && y < room.height ? y * room.width + x : -1;
}

function destination(room, x, y, prefer) {
  const pull = DIRECTIONS[room.direction];
  const straight = index(room, x + pull.x, y + pull.y);
  if (straight >= 0 && room.cells[straight] === 0) return straight;
  const sideX = -pull.y;
  const sideY = pull.x;
  const first = index(room, x + pull.x + sideX * prefer, y + pull.y + sideY * prefer);
  if (first >= 0 && room.cells[first] === 0) return first;
  const second = index(room, x + pull.x - sideX * prefer, y + pull.y - sideY * prefer);
  if (second >= 0 && room.cells[second] === 0) return second;
  return -1;
}

export function canMove(room) {
  for (let y = 0; y < room.height; y++) {
    for (let x = 0; x < room.width; x++) {
      if (room.cells[y * room.width + x] && destination(room, x, y, 1) >= 0) return true;
    }
  }
  return false;
}

export function setGravity(room, direction) {
  if (!Object.hasOwn(DIRECTIONS, direction)) return false;
  room.direction = direction;
  room.stable = !canMove(room);
  return true;
}

export function step(room) {
  // Visit the receiving edge first. A moved grain lands in an already visited
  // row or column and therefore travels at most one cell during this sweep.
  const pull = DIRECTIONS[room.direction];
  const vertical = pull.y !== 0;
  const depth = vertical ? room.height : room.width;
  const breadth = vertical ? room.width : room.height;
  const positive = vertical ? pull.y > 0 : pull.x > 0;
  const prefer = room.sweeps % 2 ? -1 : 1;
  let moved = 0;
  for (let row = 0; row < depth; row++) {
    const along = positive ? depth - 1 - row : row;
    for (let column = 0; column < breadth; column++) {
      const across = prefer === 1 ? column : breadth - 1 - column;
      const x = vertical ? across : along;
      const y = vertical ? along : across;
      const from = y * room.width + x;
      if (!room.cells[from]) continue;
      const to = destination(room, x, y, prefer);
      if (to < 0) continue;
      room.cells[to] = room.cells[from];
      room.cells[from] = 0;
      moved++;
    }
  }
  room.sweeps++;
  room.stable = moved === 0 || !canMove(room);
  return { moved, stable: room.stable };
}

function cut(room, x, y, radius) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) return 0;
  if (x < 0 || y < 0 || x >= room.width || y >= room.height) return 0;
  radius = Math.min(14, Math.max(1, Math.floor(radius)));
  x = Math.floor(x);
  y = Math.floor(y);
  let removed = 0;
  for (let row = Math.max(0, y - radius); row <= Math.min(room.height - 1, y + radius); row++) {
    for (let column = Math.max(0, x - radius); column <= Math.min(room.width - 1, x + radius); column++) {
      if ((column - x) ** 2 + (row - y) ** 2 > radius ** 2) continue;
      const at = row * room.width + column;
      if (room.cells[at]) { room.cells[at] = 0; removed++; }
    }
  }
  return removed;
}

function recordRemoval(room, removed) {
  room.remaining -= removed;
  room.removed += removed;
  room.stable = !canMove(room);
  return removed;
}

export function dig(room, x, y, radius = 5) {
  return recordRemoval(room, cut(room, x, y, radius));
}

export function digLine(room, from, to, radius = 5) {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return 0;
  // Both ends must belong to the chamber. A released/outside pointer cannot
  // create an unbounded interpolation loop or dig outside the drawn surface.
  if ([from, to].some(point => point.x < 0 || point.y < 0 || point.x >= room.width || point.y >= room.height)) return 0;
  const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  const samples = Math.max(1, Math.ceil(distance));
  let removed = 0;
  for (let sample = 0; sample <= samples; sample++) {
    const fraction = sample / samples;
    removed += cut(room, from.x + (to.x - from.x) * fraction, from.y + (to.y - from.y) * fraction, radius);
  }
  return recordRemoval(room, removed);
}
