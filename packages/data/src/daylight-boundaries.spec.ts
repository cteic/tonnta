import { describe, expect, it } from 'vitest';

import type { HourlyConditions } from '@tonnta/types';

import { isDaylightHour, sunTimes } from './daylight';
import { headlineFor } from './headline';
import { getSpot } from './spots';
import { findGoodWindows } from './summary';
import { findSwimWindows } from './swim';

const spot = getSpot('donabate');
if (spot === undefined) throw new Error('Donabate missing');
const HOUR_MS = 3_600_000;
const hour = (time: string): HourlyConditions => ({
  time,
  waveHeightM: 0.6,
  wavePeriodS: 5,
  waveDirectionDeg: 90,
  windSpeedKmh: 12,
  windGustKmh: 16,
  windDirectionDeg: 250,
  windState: 'offshore',
});

describe('Daylight recommendation boundaries', () => {
  it('does not offer the dawn hour when sunrise is early in that hour', () => {
    expect(isDaylightHour('2026-10-22T07:00:00Z', spot)).toBe(false);
    expect(isDaylightHour('2026-10-22T08:00:00Z', spot)).toBe(true);
  });

  it('switches the live headline at actual sunrise and sunset, not the hourly midpoint', () => {
    const { sunrise, sunset } = sunTimes(
      Date.parse('2026-10-22T12:00:00Z'),
      spot.latitude,
      spot.longitude
    );
    if (sunrise === undefined || sunset === undefined) throw new Error('Sun times missing');
    for (const [at, before, after] of [
      [sunrise, 'dark', 'verdict'],
      [sunset, 'verdict', 'dark'],
    ] as const) {
      const hours = [hour(new Date(Math.floor(at / HOUR_MS) * HOUR_MS).toISOString())];
      expect(headlineFor(hours, spot, at - 1).kind).toBe(before);
      expect(headlineFor(hours, spot, at + 1).kind).toBe(after);
    }
  });

  it.each(['2026-03-29', '2026-06-21', '2026-10-25', '2026-12-21'])(
    'keeps both ends of every displayed surf and swim window inside daylight on %s',
    (day) => {
      const hours = Array.from({ length: 24 }, (_, i) =>
        hour(`${day}T${String(i).padStart(2, '0')}:00:00Z`)
      );
      const { sunrise, sunset } = sunTimes(
        Date.parse(`${day}T12:00:00Z`),
        spot.latitude,
        spot.longitude
      );
      const windows = [
        ...findGoodWindows(hours, spot),
        ...findSwimWindows(hours, [], spot, Date.parse(`${day}T00:00:00Z`)),
      ];
      expect(windows.length).toBeGreaterThan(0);
      for (const window of windows) {
        expect(Date.parse(window.start)).toBeGreaterThanOrEqual(sunrise ?? Infinity);
        expect(Date.parse(window.end) + HOUR_MS).toBeLessThanOrEqual(sunset ?? -Infinity);
      }
    }
  );

  it('does not bridge missing forecast hours in surf or swim windows', () => {
    const hours = [hour('2026-07-04T10:00:00Z'), hour('2026-07-04T12:00:00Z')];
    expect(findGoodWindows(hours, spot)).toHaveLength(2);
    expect(findSwimWindows(hours, [], spot, Date.parse('2026-07-04T09:00:00Z'))).toHaveLength(2);
  });

  it('does not present a future or expired hour as current', () => {
    const hours = [hour('2026-12-21T12:00:00Z')];
    expect(headlineFor(hours, spot, Date.parse('2026-12-21T11:59:00Z')).kind).toBe('none');
    expect(headlineFor(hours, spot, Date.parse('2026-12-21T13:00:00Z')).kind).toBe('none');
  });

  it('fails closed for invalid dates and polar night, and supports midnight sun', () => {
    expect(isDaylightHour('invalid', spot)).toBe(false);
    const polar = { latitude: 78, longitude: 15 };
    expect(isDaylightHour('2026-12-21T12:00:00Z', polar)).toBe(false);
    expect(isDaylightHour('2026-06-21T23:00:00Z', polar)).toBe(true);
  });
});
