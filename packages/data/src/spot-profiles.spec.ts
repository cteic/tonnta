import { describe, expect, it } from 'vitest';

import { SPOT_PROFILE_PROVENANCE } from './spot-profiles';
import { SPOTS } from './spots';
import { spotThresholds } from './verdict';

describe('versioned surf spot profile baseline', () => {
  it('covers exactly the existing registry without approving new beta spots', () => {
    expect(Object.keys(SPOT_PROFILE_PROVENANCE).sort()).toEqual(SPOTS.map((s) => s.id).sort());
    expect(new Set(SPOTS.map((s) => s.id)).size).toBe(SPOTS.length);
  });

  it.each(SPOTS)('$id has structurally valid geography and provisional provenance', (spot) => {
    expect(Number.isFinite(spot.latitude)).toBe(true);
    expect(spot.latitude).toBeGreaterThanOrEqual(-90);
    expect(spot.latitude).toBeLessThanOrEqual(90);
    expect(Number.isFinite(spot.longitude)).toBe(true);
    expect(spot.longitude).toBeGreaterThanOrEqual(-180);
    expect(spot.longitude).toBeLessThanOrEqual(180);
    expect(spot.facing).toBeGreaterThanOrEqual(0);
    expect(spot.facing).toBeLessThan(360);
    expect(() => new Intl.DateTimeFormat('en', { timeZone: spot.timezone })).not.toThrow();
    const thresholds = spotThresholds(spot);
    expect(thresholds.flatBelowM).toBeGreaterThan(0);
    expect(thresholds.goFromM).toBeGreaterThan(thresholds.flatBelowM);
    for (const value of Object.values(thresholds)) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
    const profile = SPOT_PROFILE_PROVENANCE[spot.id as keyof typeof SPOT_PROFILE_PROVENANCE];
    expect(profile.calibration).toBe('provisional');
    expect(profile.version).toMatch(new RegExp(`^${spot.id}-v[1-9][0-9]*$`));
  });

  it('pins every scoring input and mapping to a reviewable profile version', () => {
    expect(
      SPOTS.map((spot) => ({
        ...spot,
        effectiveThresholds: spotThresholds(spot),
        provenance: SPOT_PROFILE_PROVENANCE[spot.id as keyof typeof SPOT_PROFILE_PROVENANCE],
      }))
    ).toMatchSnapshot();
  });
});
