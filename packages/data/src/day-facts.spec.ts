import { describe, expect, it } from 'vitest';

import type { HourlyConditions } from '@tonnta/types';

import { getSpot } from './spots';
import { summarizeDayFacts } from './summary';

const donabate = getSpot('donabate');
if (donabate === undefined) throw new Error('Donabate spot missing from registry');
const spot = donabate;

function hour(
  time: string,
  waveHeightM: number,
  wavePeriodS: number,
  windSpeedKmh: number,
  windDirectionDeg: number
): HourlyConditions {
  return {
    time,
    waveHeightM,
    wavePeriodS,
    waveDirectionDeg: 90,
    windSpeedKmh,
    windGustKmh: windSpeedKmh + 8,
    windDirectionDeg,
    windState: 'cross',
  };
}

describe('Per-day facts', () => {
  it('gives wave, period and wind ranges over the daylight hours only', () => {
    const days = summarizeDayFacts(
      [
        // 02:00 local is dark and must not count.
        hour('2026-07-04T01:00:00Z', 3, 14, 60, 90),
        hour('2026-07-04T09:00:00Z', 0.4, 6, 10, 250),
        hour('2026-07-04T12:00:00Z', 0.9, 8, 18, 250),
        hour('2026-07-04T15:00:00Z', 0.6, 7, 14, 250),
      ],
      spot
    );
    expect(days).toHaveLength(1);
    const [day] = days;
    expect(day).toMatchObject({
      date: '2026-07-04',
      minWaveHeightM: 0.4,
      maxWaveHeightM: 0.9,
      minWavePeriodS: 6,
      maxWavePeriodS: 8,
      minWindSpeedKmh: 10,
      maxWindSpeedKmh: 18,
      maxWindGustKmh: 26,
    });
    expect(day?.windDirectionDeg).toBeCloseTo(250, 6);
  });

  it('averages wind direction across north instead of reading south', () => {
    const [day] = summarizeDayFacts(
      [hour('2026-07-04T10:00:00Z', 0.5, 7, 12, 350), hour('2026-07-04T11:00:00Z', 0.5, 7, 12, 10)],
      spot
    );
    const deg = day?.windDirectionDeg ?? 180;
    expect(Math.min(deg, 360 - deg)).toBeLessThan(1);
  });
});
