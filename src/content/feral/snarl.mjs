export const BOARD = Object.freeze({ width: 1000, height: 680, inset: 36 });
export const NODE_CLEARANCE = 50;
export const CORD_CLEARANCE = 28;
const EPSILON = 1e-7;

function ring(count) {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    return { x: Math.round(500 + Math.cos(angle) * 400), y: Math.round(340 + Math.sin(angle) * 236) };
  });
}
function knot(id, name, count, order) {
  const solution = ring(count);
  const edges = Array.from({ length: count }, (_, index) => [index, (index + 1) % count]);
  for (let index = 0; index < count; index += 2) edges.push([index, (index + 2) % count]);
  return Object.freeze({ id, name, edges: Object.freeze(edges.map(edge => Object.freeze(edge))),
    initial: Object.freeze(order.map(index => Object.freeze({ ...solution[index] }))),
    solution: Object.freeze(solution.map(point => Object.freeze(point))) });
}
export const KNOTS = Object.freeze([
  knot('one', 'The first knot', 6, [0, 3, 1, 4, 2, 5]),
  knot('two', 'A little more cord', 8, [0, 4, 1, 5, 2, 6, 3, 7]),
  knot('three', 'The last tangle', 10, [0, 5, 1, 6, 2, 7, 3, 8, 4, 9]),
]);

const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const nearZero = value => Math.abs(value) <= EPSILON;
function onSegment(point, a, b) {
  return nearZero(cross(a, b, point)) && point.x >= Math.min(a.x, b.x) - EPSILON
    && point.x <= Math.max(a.x, b.x) + EPSILON && point.y >= Math.min(a.y, b.y) - EPSILON
    && point.y <= Math.max(a.y, b.y) + EPSILON;
}
export function segmentRelation(a, b, c, d) {
  const first = cross(a, b, c), second = cross(a, b, d);
  const third = cross(c, d, a), fourth = cross(c, d, b);
  if ([first, second, third, fourth].every(nearZero)) {
    // A shared endpoint is a point, not an overlap. Pick the non-degenerate
    // axis so vertical cords receive exactly the same treatment as horizontal.
    const axis = Math.abs(a.x - b.x) + Math.abs(c.x - d.x) >= Math.abs(a.y - b.y) + Math.abs(c.y - d.y) ? 'x' : 'y';
    const overlap = Math.min(Math.max(a[axis], b[axis]), Math.max(c[axis], d[axis]))
      - Math.max(Math.min(a[axis], b[axis]), Math.min(c[axis], d[axis]));
    return overlap > EPSILON ? 'overlap' : overlap >= -EPSILON && (onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b)) ? 'touch' : 'none';
  }
  if ((first > EPSILON && second < -EPSILON || first < -EPSILON && second > EPSILON)
    && (third > EPSILON && fourth < -EPSILON || third < -EPSILON && fourth > EPSILON)) return 'crossing';
  return onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b) ? 'touch' : 'none';
}
export function distanceToCord(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const squared = dx * dx + dy * dy;
  if (squared <= EPSILON) return Math.hypot(point.x - a.x, point.y - a.y);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / squared));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
export function inspect(points, edges) {
  if (!Array.isArray(points) || points.some(point => !Number.isFinite(point?.x) || !Number.isFinite(point?.y))) throw new TypeError('Eyelets need finite positions.');
  if (!Array.isArray(edges) || edges.some(edge => !Array.isArray(edge) || edge.length !== 2 || edge.some(index => !Number.isInteger(index) || index < 0 || index >= points.length) || edge[0] === edge[1])) throw new TypeError('Cords need two different existing eyelets.');
  const cordPairs = [], closeEyelets = [], blockedEyelets = [];
  for (let first = 0; first < points.length; first++) {
    for (let second = first + 1; second < points.length; second++) {
      if (Math.hypot(points[first].x - points[second].x, points[first].y - points[second].y) < NODE_CLEARANCE - EPSILON) closeEyelets.push([first, second]);
    }
  }
  for (let first = 0; first < edges.length; first++) {
    const [a, b] = edges[first];
    for (let second = first + 1; second < edges.length; second++) {
      const [c, d] = edges[second];
      const relation = segmentRelation(points[a], points[b], points[c], points[d]);
      const shared = a === c || a === d || b === c || b === d;
      if (relation === 'overlap' || relation !== 'none' && !shared) cordPairs.push({ first, second, relation });
    }
    for (let eyelet = 0; eyelet < points.length; eyelet++) {
      if (eyelet !== a && eyelet !== b && distanceToCord(points[eyelet], points[a], points[b]) < CORD_CLEARANCE - EPSILON) blockedEyelets.push({ eyelet, cord: first });
    }
  }
  const total = cordPairs.length + closeEyelets.length + blockedEyelets.length;
  return { cordPairs, closeEyelets, blockedEyelets, total, clear: total === 0 };
}

const copyPoints = points => points.map(point => ({ ...point }));
export function createGame() {
  return { current: 0, knots: KNOTS.map(definition => ({ points: copyPoints(definition.initial), selected: 0, shown: false })) };
}
export function chooseKnot(game, index) {
  if (!Number.isInteger(index) || index < 0 || index >= KNOTS.length) return false;
  game.current = index; return true;
}
export function selectEyelet(game, index) {
  const current = game.knots[game.current];
  if (!Number.isInteger(index) || index < 0 || index >= current.points.length) return false;
  current.selected = index; return true;
}
export function moveEyelet(game, index, x, y) {
  const current = game.knots[game.current];
  if (!Number.isInteger(index) || index < 0 || index >= current.points.length || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  current.points[index] = {
    x: Math.round(Math.max(BOARD.inset, Math.min(BOARD.width - BOARD.inset, x))),
    y: Math.round(Math.max(BOARD.inset, Math.min(BOARD.height - BOARD.inset, y))),
  };
  return true;
}
export function resetKnot(game) {
  const current = game.knots[game.current];
  current.points = copyPoints(KNOTS[game.current].initial); current.selected = 0;
  // Showing an arrangement cannot be undone by relabelling the same visit.
}
export function showArrangement(game) {
  const current = game.knots[game.current];
  current.points = copyPoints(KNOTS[game.current].solution); current.shown = true;
}
export function progress(game) {
  const reports = game.knots.map((state, index) => inspect(state.points, KNOTS[index].edges));
  const byHand = reports.map((report, index) => report.clear && !game.knots[index].shown);
  return { reports, byHand, allByHand: byHand.every(Boolean) };
}
