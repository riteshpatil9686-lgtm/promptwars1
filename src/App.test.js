import { expect, test } from 'vitest';

test('Sample safety check', () => {
  expect(1 + 1).toBe(2);
});

test('Venue Constants', () => {
  const VENUE_ID = 'venue-001';
  expect(VENUE_ID).toBe('venue-001');
});
