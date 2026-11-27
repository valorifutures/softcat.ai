export const FLOOR_ORDER = Object.freeze(['B', 'G', '1', 'H', '2', '3', '4', '5']);

export const FLOORS = Object.freeze([
  Object.freeze({ id: 'B', label: 'B', name: 'Boilers asleep', scene: 'boilers', lines: Object.freeze(['Nothing is lit.', 'The pipes are warm enough to be remembering.']) }),
  Object.freeze({ id: 'G', label: 'G', name: 'Lobby with no arrivals', scene: 'lobby', lines: Object.freeze(['The doors have stopped revolving.', 'No wet footprints cross the mat.']) }),
  Object.freeze({ id: '1', label: '1', name: 'Office of missing staples', scene: 'staples', lines: Object.freeze(['Every drawer is labelled.', 'One bent staple has avoided the inventory.']) }),
  Object.freeze({ id: 'H', label: '½', name: 'Between phone rings', scene: 'telephone', lines: Object.freeze(['The receiver has not been put down.', 'The next ring is taking its time.']) }),
  Object.freeze({ id: '2', label: '2', name: 'Rain kept indoors', scene: 'rain', lines: Object.freeze(['Rain rises from a shallow tray.', 'The ceiling remains dry.']) }),
  Object.freeze({ id: '3', label: '3', name: 'Carpet sample archive', scene: 'carpet', lines: Object.freeze(['Every square has a different memory of brown.', 'The softest one is filed under concrete.']) }),
  Object.freeze({ id: '4', label: '4', name: 'One window still warm', scene: 'window', lines: Object.freeze(['The wall has gone dark.', 'One pane has kept the afternoon.']) }),
  Object.freeze({ id: '5', label: '5', name: 'Roof before roof', scene: 'roof', lines: Object.freeze(['The vents face a ceiling of acoustic tile.', 'Above it, something calls itself outside.']) })
]);

export const STEP_MS = 260;
export const DOOR_MS = 420;

export function floorById(id) {
  return FLOORS.find((floor) => floor.id === id) ?? null;
}

export function liftPlan(from, to, options = {}) {
  const start = FLOOR_ORDER.indexOf(from);
  const end = FLOOR_ORDER.indexOf(to);
  if (start < 0 || end < 0) throw new RangeError('Unknown lift floor');
  const direction = Math.sign(end - start);
  const path = [FLOOR_ORDER[start]];
  if (direction) {
    for (let index = start + direction; direction > 0 ? index <= end : index >= end; index += direction) {
      path.push(FLOOR_ORDER[index]);
    }
  }
  const reducedMotion = options.reducedMotion === true;
  return Object.freeze({
    from,
    to,
    path: Object.freeze(path),
    stepCount: path.length - 1,
    durationMs: reducedMotion ? 0 : (DOOR_MS * 2) + ((path.length - 1) * STEP_MS)
  });
}

export function markVisited(visited, floor) {
  if (!floorById(floor)) throw new RangeError('Unknown lift floor');
  const known = Array.isArray(visited) ? visited.filter((id) => floorById(id)) : [];
  return Object.freeze([...new Set([...known, floor])]);
}
