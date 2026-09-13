export function hasWeightRecord(model) {
  return !!model?.weights && typeof model.weights.source === 'string' &&
    /^https:\/\/huggingface\.co\/[\w.-]+\/[\w.-]+\/tree\/[a-f0-9]{40}$/.test(model.weights.source);
}

export function weightLabel(model) {
  if (!hasWeightRecord(model)) return 'No weight source recorded';
  return model.weights.access === 'gated' ? 'Weight files listed, access gated' : 'Published weight files';
}

export function weightRecordErrors(model) {
  if (model.weights === null) return [];
  if (!hasWeightRecord(model)) return ['weights must be null or link to a dated Hugging Face repository revision'];
  const record = model.weights, errors = [];
  if (!Number.isFinite(Date.parse(record.checkedAt)) || Date.parse(record.checkedAt) > Date.now() + 60_000) errors.push('weights.checkedAt must be a non-future timestamp');
  if (!['public', 'gated'].includes(record.access)) errors.push('weights.access must be public or gated');
  if (typeof record.licence !== 'string' || !record.licence) errors.push('weights.licence must record the model card declaration');
  if (!Number.isInteger(record.fileCount) || record.fileCount < 1) errors.push('weights.fileCount must count at least one published weight file');
  return errors;
}
