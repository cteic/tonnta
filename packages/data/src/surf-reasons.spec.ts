import { describe, expect, it } from 'vitest';

import type { HourlyConditions } from '@tonnta/types';

import { surfProfileVersion } from './spot-profiles';
import { SPOTS } from './spots';
import { SURF_REASON_CODES, assessHour, assessHourWithReason, spotThresholds } from './verdict';

const launchSpot = SPOTS.find((spot) => spot.id === 'donabate');
if (launchSpot === undefined) throw new Error('Missing launch spot');
const spot = launchSpot;
const base: HourlyConditions = {
  time: '2026-10-20T12:00:00Z',
  waveHeightM: 0.6,
  wavePeriodS: 6,
  waveDirectionDeg: 70,
  windSpeedKmh: 12,
  windGustKmh: 15,
  windDirectionDeg: 250,
  windState: 'offshore',
};

describe('stable surf decision reasons', () => {
  const cases: [string, Partial<HourlyConditions>][] = [
    ['thunderstorm', { weatherCode: 95, waveHeightM: NaN }],
    ['invalid-forecast', { waveHeightM: NaN }],
    ['onshore-blown-out', { windDirectionDeg: 70, windSpeedKmh: 40, waveHeightM: 0.1 }],
    ['flat-glassy', { waveHeightM: 0.1, windSpeedKmh: 4 }],
    ['below-surf-height', { waveHeightM: 0.1 }],
    ['short-period-unconfirmed', { wavePeriodS: 3 }],
    ['rideable-within-wind-limit', {}],
    ['wind-above-limit', { windSpeedKmh: 31 }],
    ['borderline-height', { waveHeightM: 0.35 }],
  ];
  it.each(cases)('%s names the deciding branch without altering legacy results', (code, change) => {
    const hour = { ...base, ...change };
    const { reasonCode, ...legacy } = assessHourWithReason(hour, spot);
    expect(reasonCode).toBe(code);
    expect(legacy).toEqual(assessHour(hour, spot));
    expect(assessHourWithReason(hour, spot)).toEqual(assessHourWithReason(hour, spot));
  });
  it('covers the complete code vocabulary', () => {
    expect(cases.map(([code]) => code).sort()).toEqual([...SURF_REASON_CODES].sort());
  });
  it.each(SPOTS)('$id identifies only matching registered configuration', (registered) => {
    expect(surfProfileVersion({ ...registered })).toBe(`${registered.id}-v1`);
    for (const change of [
      { id: 'unknown' },
      { latitude: registered.latitude + 1 },
      { longitude: registered.longitude + 1 },
      { facing: registered.facing + 1 },
      { timezone: 'unknown' },
      { tideStationId: 'different' },
      { buoyStationId: 'different' },
      { tideGaugeId: 'different' },
      { epaBeachId: 'different' },
      ...Object.keys(spotThresholds(registered)).map((key) => ({
        thresholds: { ...spotThresholds(registered), [key]: 999 },
      })),
      { thresholds: { ...spotThresholds(registered), minGoPeriodS: 999 } },
    ])
      expect(surfProfileVersion({ ...registered, ...change })).toBeNull();
  });
});
