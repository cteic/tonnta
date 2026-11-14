import { describe, expect, it } from 'vitest';

import { getSpot, isDaylightHour } from '@tonnta/data';
import type { HourlyConditions } from '@tonnta/types';

import type { SpotConditions } from './conditions';
import { forecastHoursToCapture } from './forecast-capture';

const spot = getSpot('donabate');
if (spot === undefined) throw new Error('Missing Donabate');
const now = Date.parse('2026-11-09T12:30:00Z');
const hour: HourlyConditions = {
  time: '2026-11-09T12:00:00Z',
  waveHeightM: 0.5,
  wavePeriodS: 3,
  waveDirectionDeg: 90,
  windSpeedKmh: 22,
  windGustKmh: 25,
  windDirectionDeg: 90,
  windState: 'onshore',
};
const conditions = { spot, loadedAt: now, hours: [hour] } as SpotConditions;

describe('Local forecast evidence capture', () => {
  it('records the actual short-period assessment, not the cached hero verdict', () => {
    const saved = forecastHoursToCapture(conditions, now);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.hour).toEqual(hour);
    expect(saved[0]?.verdict.verdict).toBe('maybe');
    expect(saved[0]?.verdict.board).toBeUndefined();
  });
  it('never manufactures a past forecast from today’s retrieved forecast', () => {
    const old = { ...hour, time: '2026-11-09T11:00:00Z' };
    expect(forecastHoursToCapture({ ...conditions, hours: [old] }, now)).toEqual([]);
  });
  it('ignores stale or future-dated retrievals', () => {
    for (const loadedAt of [now - 3_600_000, now + 1, Number.NaN]) {
      expect(forecastHoursToCapture({ ...conditions, loadedAt }, now)).toEqual([]);
    }
  });
  it('captures only complete daylight hours within the seven-day horizon', () => {
    const hours = Array.from({ length: 240 }, (_, i) => ({
      ...hour,
      time: new Date(now - 12.5 * 3_600_000 + i * 3_600_000).toISOString(),
    }));
    const saved = forecastHoursToCapture({ ...conditions, hours }, now);
    expect(saved.length).toBeGreaterThan(0);
    for (const { hour: value } of saved) {
      expect(Date.parse(value.time) + 3_600_000).toBeGreaterThan(now);
      expect(Date.parse(value.time)).toBeLessThan(now + 7 * 24 * 3_600_000);
      expect(isDaylightHour(value.time, conditions.spot)).toBe(true);
    }
  });
});
