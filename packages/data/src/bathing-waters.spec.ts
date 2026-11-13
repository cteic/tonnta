import { describe, expect, it } from 'vitest';

import { bathingWaterSlug } from './bathing-water-slug';
import {
  BATHING_WATERS,
  bathingSeasonOn,
  bathingWaterSlugForSpot,
  bathingWatersByCounty,
  getBathingWater,
} from './bathing-waters';

describe('Bathing water registry', () => {
  it('holds the EPA Identified Bathing Waters with unique slugs', () => {
    expect(BATHING_WATERS).toHaveLength(154);
    expect(new Set(BATHING_WATERS.map((water) => water.slug)).size).toBe(154);
    expect(new Set(BATHING_WATERS.map((water) => water.id)).size).toBe(154);
  });

  it('places every water on the island of Ireland', () => {
    for (const water of BATHING_WATERS) {
      expect(water.latitude).toBeGreaterThan(51.3);
      expect(water.latitude).toBeLessThan(55.5);
      expect(water.longitude).toBeGreaterThan(-10.7);
      expect(water.longitude).toBeLessThan(-5.9);
    }
  });

  it('resolves the old Donabate spot link to Balcarrick Beach', () => {
    const slug = bathingWaterSlugForSpot('donabate');
    expect(slug).toBe('donabate-balcarrick-beach');
    expect(getBathingWater(slug ?? '')?.id).toBe('IEEABWC020_0000_0100');
  });

  it('has no bathing water for the Fuerteventura spots', () => {
    expect(bathingWaterSlugForSpot('el-cotillo')).toBeUndefined();
    expect(bathingWaterSlugForSpot('corralejo')).toBeUndefined();
  });

  it('groups by county in alphabetical order', () => {
    const counties = bathingWatersByCounty().map((group) => group.county);
    expect(counties).toEqual([...counties].sort((a, b) => a.localeCompare(b)));
    expect(counties).toContain('Dublin');
    expect(bathingWatersByCounty().flatMap((group) => group.waters)).toHaveLength(154);
  });

  it('builds ASCII slugs from Irish names', () => {
    expect(bathingWaterSlug('An Trá Mhór, Coill Rua, Indreabhán')).toBe(
      'an-tra-mhor-coill-rua-indreabhan'
    );
  });
});

describe('Bathing season', () => {
  it.each([
    ['2026-05-31T22:59:00Z', false, '2026-06-01'], // 23:59 Irish time, 31 May
    ['2026-05-31T23:00:00Z', true, '2026-06-01'], // midnight Irish time, 1 June
    ['2026-09-15T22:59:00Z', true, '2026-06-01'],
    ['2026-09-15T23:00:00Z', false, '2027-06-01'],
    ['2026-11-13T12:00:00Z', false, '2027-06-01'],
    ['2027-01-10T12:00:00Z', false, '2027-06-01'],
  ])('at %s in season is %s, season starts %s', (at, inSeason, start) => {
    const state = bathingSeasonOn(new Date(at));
    expect(state.inSeason).toBe(inSeason);
    expect(state.start).toBe(start);
  });
});
