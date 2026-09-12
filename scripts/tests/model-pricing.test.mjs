import test from 'node:test';
import assert from 'node:assert/strict';
import { hasVerifiedPrice, priceLabel, priceOrder, pricingRange } from '../../src/lib/model-pricing.mjs';
const priced = { pricingStatus: 'verified', inputPrice: 0.255, outputPrice: 1.02, pricingCheckedAt: '2026-09-12T21:57:00Z' };

test('unknown, stale and unlisted prices cannot silently become free', () => {
  assert.equal(hasVerifiedPrice({ inputPrice: 0, outputPrice: 0 }), false);
  assert.equal(hasVerifiedPrice({ ...priced, inputPrice: null }), false);
  assert.equal(hasVerifiedPrice({ ...priced, pricingStatus: 'review-needed' }), false);
  assert.equal(priceLabel({ ...priced, pricingStatus: 'not-listed' }), 'Not listed');
});
test('an explicitly verified zero is valid and decimal pricing is preserved', () => {
  assert.equal(priceLabel({ ...priced, inputPrice: 0 }), '$0');
  assert.equal(priceLabel(priced), '$0.255');
  assert.equal(hasVerifiedPrice({ ...priced, inputPrice: -1 }), false);
});
test('unknown models sort last in either price direction', () => {
  const unknown = { inputPrice: null, outputPrice: null, pricingStatus: 'not-listed' };
  for (const direction of [1, -1]) assert.ok(priceOrder(priced, unknown, direction) < 0);
});
test('freshness reflects all verified prices and excludes failed checks', () => {
  assert.deepEqual(pricingRange([priced, { ...priced, pricingStatus: 'review-needed', pricingCheckedAt: '2027-01-01' }]), { first: priced.pricingCheckedAt, last: priced.pricingCheckedAt, count: 1 });
  assert.deepEqual(pricingRange([]), { first: null, last: null, count: 0 });
});
