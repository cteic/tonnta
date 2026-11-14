import { describe, expect, it } from 'vitest';

import type { ChartHour } from '../lib/conditions';
import { buildChartGeometry, longestGoRun } from './chart-geometry';

const hours: ChartHour[] = [true, true, false, false].map((daylight, i) => ({
  time: new Date(Date.UTC(2026, 11, 21, 14 + i)).toISOString(),
  waveHeightM: 0.6,
  windSpeedKmh: 12,
  verdict: 'go',
  daylight,
}));

describe('Daylight in the conditions chart', () => {
  it('excludes dark hours from the spoken GO window', () => {
    expect(longestGoRun(hours)).toEqual({ start: hours[0]?.time, end: hours[1]?.time });
    expect(longestGoRun(hours.slice(2))).toBeUndefined();
  });

  it('passes daylight to the bands so dark hours are not coloured as GO', () => {
    const geometry = buildChartGeometry(hours, {
      width: 200,
      height: 100,
      top: 4,
      left: 4,
      right: 4,
      bottom: 4,
    });
    expect(geometry.bands.map((band) => band.daylight)).toEqual([true, true, false, false]);
  });
});
