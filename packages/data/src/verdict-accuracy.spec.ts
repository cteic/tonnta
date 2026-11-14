import { describe, expect, it } from 'vitest';

import type { HourlyConditions, Spot } from '@tonnta/types';

import { headlineFor } from './headline';
import { getSpot } from './spots';
import { findGoodWindows, nextGoodWindow, summarizeDays } from './summary';
import {
  DEFAULT_THRESHOLDS,
  SURF_VERDICT_ENGINE_VERSION,
  assessHour,
  spotThresholds,
} from './verdict';

function spotWithId(id: string): Spot {
  const spot = getSpot(id);
  if (spot === undefined) throw new Error(`Missing spot: ${id}`);
  return spot;
}

const donabate = spotWithId('donabate');
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

const REQUIRED_INPUTS: (keyof Pick<
  HourlyConditions,
  | 'waveHeightM'
  | 'wavePeriodS'
  | 'waveDirectionDeg'
  | 'windSpeedKmh'
  | 'windGustKmh'
  | 'windDirectionDeg'
>)[] = [
  'waveHeightM',
  'wavePeriodS',
  'waveDirectionDeg',
  'windSpeedKmh',
  'windGustKmh',
  'windDirectionDeg',
];

describe('provisional Donabate short-period uncertainty guard', () => {
  it('versions the rules independently of upstream model issuance', () => {
    expect(SURF_VERDICT_ENGINE_VERSION).toBe('donabate-short-period-v1');
    expect(spotThresholds(donabate).minGoPeriodS).toBe(4);
  });

  it.each([3, 3.9])('withholds GO and board advice at %ss', (wavePeriodS) => {
    expect(assessHour({ ...hour, wavePeriodS }, donabate)).toEqual({
      verdict: 'maybe',
      reason: 'Short-period sea; breaking surf is unconfirmed. Check locally.',
    });
  });

  it('leaves the existing rules at the inclusive 4s boundary', () => {
    expect(assessHour({ ...hour, wavePeriodS: 4 }, donabate).verdict).toBe('go');
  });

  it('retains valid flat, thunderstorm and blown-out precedence', () => {
    expect(assessHour({ ...hour, waveHeightM: 0.2 }, donabate).verdict).toBe('flat');
    const storm = assessHour({ ...hour, weatherCode: 95 }, donabate);
    expect(storm.verdict).toBe('blown');
    expect(storm.reason).toContain('Lightning');
    const blown = assessHour({ ...hour, windSpeedKmh: 40, windGustKmh: 50 }, donabate);
    expect(blown.verdict).toBe('blown');
    expect(blown.reason).toContain('blown out');
  });

  it('does not replace an existing marginal-wind explanation', () => {
    const result = assessHour({ ...hour, windSpeedKmh: 28 }, donabate);
    expect(result.verdict).toBe('maybe');
    expect(result.reason).toContain('could be messy');
  });

  it.each(['el-cotillo', 'corralejo'])('does not silently tune %s', (id) => {
    const spot = spotWithId(id);
    expect(spotThresholds(spot).minGoPeriodS).toBeUndefined();
    expect(assessHour({ ...hour, waveHeightM: 0.9 }, spot).verdict).toBe('go');
  });

  it('retains defaults for a spot with no local tuning', () => {
    const unconfigured = { ...donabate };
    delete unconfigured.thresholds;
    expect(spotThresholds(unconfigured)).toBe(DEFAULT_THRESHOLDS);
    expect(assessHour(hour, unconfigured).verdict).toBe('go');
  });

  it('supports an explicit caller threshold override without changing spot config', () => {
    const thresholds = { ...spotThresholds(donabate), minGoPeriodS: 5 };
    expect(assessHour({ ...hour, wavePeriodS: 4 }, donabate, thresholds).verdict).toBe('maybe');
    expect(spotThresholds(donabate).minGoPeriodS).toBe(4);
  });

  it('propagates to the headline, day verdict and surf window selectors', () => {
    const hours = [hour, { ...hour, time: '2026-11-09T13:00:00Z' }];
    const now = Date.parse('2026-11-09T12:15:00Z');
    const headline = headlineFor(hours, donabate, now);
    expect(headline.kind).toBe('verdict');
    if (headline.kind !== 'verdict') throw new Error('Missing daylight verdict');
    expect(headline.result.verdict).toBe('maybe');
    expect(headline.result.board).toBeUndefined();
    expect(findGoodWindows(hours, donabate)).toEqual([]);
    expect(nextGoodWindow(hours, donabate, now)).toBeUndefined();
    expect(summarizeDays(hours, donabate)).toEqual([expect.objectContaining({ verdict: 'maybe' })]);
    expect(summarizeDays(hours, donabate)[0]?.bestWindow).toBeUndefined();
  });

  it('does not let short-period hours extend an otherwise valid GO window', () => {
    const hours = [hour, { ...hour, time: '2026-11-09T13:00:00Z', wavePeriodS: 4 }];
    expect(findGoodWindows(hours, donabate).map((window) => window.hours)).toEqual([[hours[1]]]);
  });
});

describe('invalid direct surf inputs fail closed without claiming flat water', () => {
  for (const field of REQUIRED_INPUTS) {
    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1])(
      `does not recommend surfing when ${field} is %s`,
      (invalid) => {
        const result = assessHour({ ...hour, wavePeriodS: 5, [field]: invalid }, donabate);
        expect(result).toEqual({
          verdict: 'maybe',
          reason: 'Forecast data is invalid; breaking surf is unconfirmed. Check locally.',
        });
      }
    );
  }

  it('rejects positive wave height with zero period', () => {
    expect(assessHour({ ...hour, wavePeriodS: 0 }, donabate).reason).toContain('invalid');
  });

  it.each(['waveDirectionDeg', 'windDirectionDeg'])(
    'rejects %s outside a compass circle',
    (field) => {
      expect(assessHour({ ...hour, wavePeriodS: 5, [field]: 361 }, donabate).reason).toContain(
        'invalid'
      );
    }
  );

  it('allows a genuine zero sea and a negative Celsius temperature', () => {
    const flat = { ...hour, waveHeightM: 0, wavePeriodS: 0, seaTempC: -1 };
    expect(assessHour(flat, donabate).verdict).toBe('flat');
  });

  it('accepts both conventional north bearings', () => {
    for (const bearing of [0, 360]) {
      const valid = {
        ...hour,
        wavePeriodS: 5,
        waveDirectionDeg: bearing,
        windDirectionDeg: bearing,
      };
      expect(assessHour(valid, donabate).verdict).toBe('go');
    }
  });

  it('retains a known lightning warning even when a numeric input is invalid', () => {
    const result = assessHour({ ...hour, waveHeightM: Number.NaN, weatherCode: 95 }, donabate);
    expect(result.verdict).toBe('blown');
    expect(result.reason).toContain('Lightning');
    expect(result.board).toBeUndefined();
  });
});
