// Original plate geometry. Fixed-colour intersections avoid renderer-dependent blending.
export const INKS = Object.freeze([
  Object.freeze({ name: 'Raspberry', colour: '#df235f', shape: '<path fill-rule="evenodd" clip-rule="evenodd" d="M310 230a130 130 0 1 1-260 0 130 130 0 1 1 260 0M242 230a62 62 0 1 0-124 0 62 62 0 1 0 124 0"/><path d="M80 410h230v65H80zM320 320h60v70h60v70h-120z"/>' }),
  Object.freeze({ name: 'Cobalt', colour: '#254bc8', shape: '<path d="M245 95h80v85h85v80h-85v85h-80zM115 320h75v180h-75z"/><circle cx="345" cy="420" r="85"/>' }),
  Object.freeze({ name: 'Yellow', colour: '#f4bf26', shape: '<path d="M70 195h370v72H70zM235 330h70v60h70v60h-70v60h-70z"/><circle cx="350" cy="130" r="63"/>' }),
]);
export const LIMITS = Object.freeze({ x: 90, y: 90, rotation: 30 });
const INITIAL = [{ x: -18, y: 14, rotation: -8 }, { x: 16, y: -12, rotation: 6 }, { x: -4, y: 0, rotation: -3 }];

export function initialPlates() { return INITIAL.map(plate => ({ ...plate })); }
export function normalisePlates(plates) {
  return INKS.map((_, index) => Object.fromEntries(Object.entries(LIMITS).map(([key, limit]) => {
    const raw = Number(plates?.[index]?.[key]);
    return [key, Number.isFinite(raw) ? Math.max(-limit, Math.min(limit, Math.round(raw))) : 0];
  })));
}
export function adjustPlate(plates, index, key, value) {
  const next = normalisePlates(plates);
  if (Number.isInteger(index) && index >= 0 && index < INKS.length && Object.hasOwn(LIMITS, key)) {
    next[index][key] = value;
  }
  return normalisePlates(next);
}
export function alignPlates() { return INKS.map(() => ({ x: 0, y: 0, rotation: 0 })); }
export function resetPlate(plates, index) {
  const next = normalisePlates(plates);
  if (Number.isInteger(index) && index >= 0 && index < INKS.length) next[index] = { ...INITIAL[index] };
  return next;
}
export function registrationSummary(plates) {
  return normalisePlates(plates).map((plate, index) => `${INKS[index].name}: horizontal ${plate.x}, vertical ${plate.y}, rotation ${plate.rotation}°`).join('. ') + '.';
}
export function renderPrint(plates) {
  const normal = normalisePlates(plates);
  const transform = plate => `translate(${plate.x} ${plate.y}) rotate(${plate.rotation} 250 300)`;
  const definitions = normal.map((plate, index) => `<clipPath id="plate-${index}" clipPathUnits="userSpaceOnUse" transform="${transform(plate)}">${INKS[index].shape}</clipPath>`).join('');
  const layer = (indices, colour) => indices.reduceRight((inside, index) => `<g clip-path="url(#plate-${index})">${inside}</g>`, `<rect width="500" height="600" fill="${colour}"/>`);
  const inks = INKS.map((ink, index) => layer([index], ink.colour)).join('');
  const overlaps = layer([0, 1], '#392264') + layer([0, 2], '#dc5125') + layer([1, 2], '#397557') + layer([0, 1, 2], '#343a38');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="500" height="600" role="img" aria-labelledby="print-title print-description"><title id="print-title">Off Register: three-ink print</title><desc id="print-description">Original circles, bars, cuts and stepped forms in raspberry, cobalt and yellow, with flat mixed colours where the inks overlap. ${registrationSummary(normal)}</desc><defs>${definitions}<clipPath id="paper-edge"><rect x="28" y="28" width="444" height="544"/></clipPath></defs><rect width="500" height="600" fill="#fff8e8"/><g clip-path="url(#paper-edge)">${inks}${overlaps}</g><path d="M12 28h16M28 12v16M472 12v16M472 28h16M12 572h16M28 572v16M472 572h16M472 572v16" fill="none" stroke="#766e5b" stroke-width="1"/></svg>`;
}
export function pullPrint(plates) {
  const snapshot = normalisePlates(plates).map(plate => Object.freeze(plate));
  return Object.freeze({ plates: Object.freeze(snapshot), svg: renderPrint(snapshot), summary: registrationSummary(snapshot) });
}
