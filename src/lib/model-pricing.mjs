export function hasVerifiedPrice(model) {
  return model?.pricingStatus === 'verified' &&
    Number.isFinite(model.inputPrice) && model.inputPrice >= 0 &&
    Number.isFinite(model.outputPrice) && model.outputPrice >= 0;
}

export function priceLabel(model, field = 'inputPrice') {
  if (model?.pricingStatus === 'not-listed') return 'Not listed';
  if (!hasVerifiedPrice(model)) return 'Unverified';
  return '$' + model[field].toLocaleString('en-US', { maximumFractionDigits: 6 });
}

export function priceOrder(a, b, direction = 1) {
  const aKnown = hasVerifiedPrice(a);
  const bKnown = hasVerifiedPrice(b);
  if (aKnown !== bKnown) return aKnown ? -1 : 1;
  return aKnown ? (a.inputPrice - b.inputPrice) * direction : 0;
}

export function pricingRange(models) {
  const dates = models.filter(hasVerifiedPrice).map((model) => model.pricingCheckedAt)
    .filter((value) => typeof value === 'string' && Number.isFinite(Date.parse(value)))
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  return { first: dates[0] ?? null, last: dates.at(-1) ?? null, count: dates.length };
}
