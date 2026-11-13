import { describe, expect, it } from 'vitest';

import { parseBathingWaterStatus } from './epa-bathing';
import { parseBeachSea, parseBeachWeather, rainLast48h } from './open-meteo-beach';

const ID = 'IEEABWC020_0000_0100';

function location(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    beach_id: ID,
    current_annual_water_quality_classification: 'Excellent Quality',
    current_annual_classification_year: 2025,
    has_lifeguard: 'Yes',
    lifeguard_availability: '11am to 7pm weekends only in June & full time July & August',
    is_blue_flag: 'Yes',
    has_all_season_bathing_restriction_in_place: 'No',
    reason_for_all_season_bathing_restriction: null,
    short_term_pollution_risk: 'Yes',
    beach_profile_url: 'https://www.beaches.ie/profile.pdf',
    last_updated: '2026-03-31T11:17:53',
    ...overrides,
  };
}

describe('EPA bathing water status', () => {
  it('reads the official fields as written', () => {
    expect(parseBathingWaterStatus(location({}), ID)).toEqual({
      beachId: ID,
      classification: 'Excellent Quality',
      classificationYear: 2025,
      hasLifeguard: true,
      lifeguardAvailability: '11am to 7pm weekends only in June & full time July & August',
      isBlueFlag: true,
      allSeasonRestriction: false,
      shortTermPollutionRisk: true,
      profileUrl: 'https://www.beaches.ie/profile.pdf',
      lastUpdated: '2026-03-31T11:17:53',
    });
  });

  it('treats anything but Yes or No as unknown, never as no', () => {
    const status = parseBathingWaterStatus(
      location({ has_lifeguard: null, has_all_season_bathing_restriction_in_place: 'Unknown' }),
      ID
    );
    expect(status.hasLifeguard).toBeUndefined();
    expect(status.allSeasonRestriction).toBeUndefined();
  });

  it('drops links that are not https', () => {
    expect(
      parseBathingWaterStatus(location({ beach_profile_url: 'javascript:alert(1)' }), ID).profileUrl
    ).toBeUndefined();
  });

  it('rejects a record for another beach', () => {
    expect(() => parseBathingWaterStatus(location({ beach_id: 'other' }), ID)).toThrow();
  });
});

function hourlyTimes(endIso: string, count: number): string[] {
  const end = Date.parse(endIso);
  return Array.from({ length: count }, (_, index) =>
    new Date(end - (count - 1 - index) * 3_600_000).toISOString().slice(0, 16)
  );
}

describe('Open-Meteo beach values', () => {
  const now = Date.parse('2026-11-13T10:45:00Z');

  it('sums rain over the 48 hours up to now', () => {
    const times = hourlyTimes('2026-11-13T23:00:00Z', 72);
    const values = times.map(() => 0.5);
    expect(rainLast48h(times, values, now)).toBe(24);
  });

  it('gives no rain total when an hour is missing', () => {
    const times = hourlyTimes('2026-11-13T23:00:00Z', 72);
    const values: (number | null)[] = times.map(() => 0.5);
    values[40] = null;
    expect(rainLast48h(times, values, now)).toBeUndefined();
  });

  it('gives no rain total without a full 48 hours of history', () => {
    const times = hourlyTimes('2026-11-13T10:00:00Z', 10);
    expect(
      rainLast48h(
        times,
        times.map(() => 0),
        now
      )
    ).toBeUndefined();
  });

  it('reads current weather and leaves missing values unknown', () => {
    const weather = parseBeachWeather({
      current: { time: '2026-11-13T10:45', temperature_2m: 2.2, wind_speed_10m: null },
    });
    expect(weather).toEqual({ time: '2026-11-13T10:45:00.000Z', airTemperatureC: 2.2 });
  });

  it('has no sea values inland', () => {
    expect(
      parseBeachSea({
        current: { time: '2026-11-13T10:45', wave_height: null, sea_surface_temperature: null },
      })
    ).toEqual({ time: '2026-11-13T10:45:00.000Z' });
  });
});
