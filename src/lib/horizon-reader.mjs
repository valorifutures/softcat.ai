// Editorial summaries apply only to the published scope they describe.
// A future evidence review can move a date without invalidating a summary.
// A changed milestone or test falls back to the complete published wording.
export function matchingPredictionGuide(record, guides) {
  const guide = guides.find(item => item.id === record?.id);
  if (!guide || guide.scope.milestone !== record.milestone
      || JSON.stringify(guide.scope.resolution) !== JSON.stringify(record.resolution)) return null;
  return guide;
}

export function shortMovement(movement) {
  return movement.kind === 'unchanged' ? 'Date unchanged' : movement.label;
}
