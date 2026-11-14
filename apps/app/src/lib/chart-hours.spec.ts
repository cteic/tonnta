import { describe, expect, it } from 'vitest';

import { getSpot } from '@tonnta/data';
import type { HourlyConditions } from '@tonnta/types';

import { chartHoursAt } from './conditions';

const spot = getSpot('donabate');
if (spot === undefined) throw new Error('Donabate missing');
const hours: HourlyConditions[] = [14, 15, 16, 17].map((h) => ({
  time: `2026-12-21T${h}:00:00Z`,
  waveHeightM: 0.6,
  wavePeriodS: 5,
  waveDirectionDeg: 90,
  windSpeedKmh: 12,
  windGustKmh: 16,
  windDirectionDeg: 250,
  windState: 'offshore',
}));

describe('Chart clock rollover', () => {
  it('drops past hours when the view resumes in a later hour', () => {
    const chart = chartHoursAt(hours, spot, Date.parse('2026-12-21T16:10:00Z'));
    expect(chart.map((hour) => hour.time)).toEqual(hours.slice(2).map((hour) => hour.time));
    expect(chart.every((hour) => !hour.daylight && hour.board === undefined)).toBe(true);
  });

  it('does not retain a chart after its downloaded forecast expires', () => {
    expect(chartHoursAt(hours, spot, Date.parse('2026-12-21T18:00:00Z'))).toEqual([]);
  });
});
