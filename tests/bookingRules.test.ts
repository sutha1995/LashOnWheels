import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateBookingTotal, calculateDistanceKm } from '../src/lib/bookingRules.ts';

test('calculates a booking total including travel fee', () => {
  assert.equal(calculateBookingTotal(85, 5), 90);
  assert.equal(calculateBookingTotal(45.5, 4.25), 49.75);
});

test('calculates distance and preserves unavailable locations', () => {
  assert.equal(calculateDistanceKm(3.139, 101.6869, null, null), null);
  assert.equal(calculateDistanceKm(3.139, 101.6869, 3.139, 101.6869), 0);
  assert.ok(calculateDistanceKm(3.139, 101.6869, 3.35, 101.25)! > 40);
});
