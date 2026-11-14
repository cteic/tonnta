import { describe, expect, it } from 'vitest';

import { getSpot, headlineFor, sunTimes } from '@tonnta/data';
import type { HourlyConditions } from '@tonnta/types';

import type { SpotConditions } from './conditions';
import { conditionsAt } from './live-conditions';

const donabate = getSpot('donabate');
if (donabate === undefined) throw new Error('Donabate missing');
const spot = donabate;
const start = Date.parse('2026-10-22T00:00:00Z');
const hours: HourlyConditions[] = Array.from({ length: 48 }, (_, i) => ({
  time: new Date(start + i * 3_600_000).toISOString(),
  waveHeightM: 0.6,
  wavePeriodS: 5,
  waveDirectionDeg: 90,
  windSpeedKmh: 12,
  windGustKmh: 16,
  windDirectionDeg: 250,
  windState: 'offshore',
}));
const initial: SpotConditions = {
  spot,
  loadedAt: start + 12 * 3_600_000,
  hours,
  tides: [],
  days: [],
  warnings: [],
  swimWindows: [],
  headline: headlineFor(hours, spot, start + 12 * 3_600_000),
  now: { verdict: 'go', reason: 'Good conditions' },
  swimNow: { verdict: 'ok', reason: 'Calm', nearHighTide: false },
};

describe('Local clock forecast refresh', () => {
  it('changes an already-open daylight screen to dark at sunset', () => {
    const sunset = sunTimes(start + 12 * 3_600_000, spot.latitude, spot.longitude).sunset;
    if (sunset === undefined) throw new Error('Sunset missing');
    expect(conditionsAt({ ...initial, loadedAt: sunset - 60_000 }, sunset - 1).headline.kind).toBe(
      'verdict'
    );
    const dark = conditionsAt({ ...initial, loadedAt: sunset - 60_000 }, sunset + 1);
    expect(dark.headline.kind).toBe('dark');
    expect(dark.swimFirstLight).toBeDefined();
    expect(initial.headline.kind).toBe('verdict');
  });

  it('returns to the current verdict when a sleeping tab resumes after sunrise', () => {
    const sunrise = sunTimes(start + 12 * 3_600_000, spot.latitude, spot.longitude).sunrise;
    if (sunrise === undefined) throw new Error('Sunrise missing');
    const dark = conditionsAt({ ...initial, loadedAt: sunrise - 60_000 }, sunrise - 1);
    const light = conditionsAt(dark, sunrise + 1);
    expect(light.headline.kind).toBe('verdict');
    expect(light.swimFirstLight).toBeUndefined();
  });

  it('requires fresh checks even when downloaded hours still cover tomorrow', () => {
    const stale = conditionsAt(initial, initial.loadedAt + 3_600_000);
    expect(stale.headline.kind).toBe('none');
    expect(stale.swimWindows).toEqual([]);
    expect(stale.nextWindow).toBeUndefined();
  });

  it('does not call an expired forecast current', () => {
    const expired = conditionsAt(initial, start + 72 * 3_600_000);
    expect(expired.currentHour).toBeUndefined();
    expect(expired.now.verdict).not.toBe('go');
    expect(expired.swimNow.verdict).toBe('no');
  });
});
