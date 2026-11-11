import { describe, expect, it } from 'vitest';

import type {
  HourlyConditions,
  SwimVerdictResult,
  WaterQualityAlert,
  WaterQualityCheck,
  WaterQualityStatus,
} from '@tonnta/types';

import { assessSwimHour } from './swim';
import {
  MAX_WATER_QUALITY_AGE_MS,
  applySwimWaterQuality,
  getWaterQualityStatus,
  isWaterQualityUnknown,
  waterQualityMessage,
} from './water-quality';

const now = Date.parse('2026-11-10T12:00:00Z');
const active: WaterQualityAlert = {
  beachId: 'test',
  beachName: 'Test Beach',
  restrictionInPlace: true,
};
const lifted = { ...active, restrictionInPlace: false };
const good: SwimVerdictResult = {
  verdict: 'great',
  reason: 'Modeled calm conditions.',
  nearHighTide: true,
};
const unknown: WaterQualityStatus[] = [
  'not-reported',
  'checked',
  'unavailable',
  'unmapped',
  'stale',
  'unchecked',
];
const hour: HourlyConditions = {
  time: '2026-11-10T12:00:00Z',
  waveHeightM: 0.2,
  wavePeriodS: 5,
  waveDirectionDeg: 90,
  windSpeedKmh: 8,
  windGustKmh: 10,
  windDirectionDeg: 90,
  windState: 'onshore',
  seaTempC: 15.2,
};

describe('Bathing-notice knowledge', () => {
  it('expires a completed retrieval at exactly fifteen minutes', () => {
    const check: WaterQualityCheck = { status: 'checked', checkedAt: now };
    expect(getWaterQualityStatus(check, undefined, now)).toBe('not-reported');
    expect(getWaterQualityStatus(check, undefined, now + MAX_WATER_QUALITY_AGE_MS - 1)).toBe(
      'not-reported'
    );
    expect(getWaterQualityStatus(check, undefined, now + MAX_WATER_QUALITY_AGE_MS)).toBe('stale');
  });

  it('fails closed for missing state and invalid or future retrieval times', () => {
    expect(getWaterQualityStatus(undefined, undefined, now)).toBe('unchecked');
    for (const checkedAt of [NaN, Infinity, -Infinity, now + 1, undefined]) {
      expect(
        getWaterQualityStatus({ status: 'checked', checkedAt } as WaterQualityCheck, undefined, now)
      ).toBe('unchecked');
    }
    for (const clock of [NaN, Infinity, -Infinity]) {
      expect(getWaterQualityStatus({ status: 'checked', checkedAt: now }, undefined, clock)).toBe(
        'unchecked'
      );
    }
  });

  it('keeps failure and unmapped distinct from a successful empty check', () => {
    expect(getWaterQualityStatus({ status: 'unavailable', attemptedAt: now }, undefined, now)).toBe(
      'unavailable'
    );
    expect(getWaterQualityStatus({ status: 'unmapped' }, undefined, now)).toBe('unmapped');
    expect(getWaterQualityStatus({ status: 'checked', checkedAt: now }, undefined, now)).toBe(
      'not-reported'
    );
    expect(getWaterQualityStatus({ status: 'unavailable', attemptedAt: now }, lifted, now)).toBe(
      'unavailable'
    );
    expect(getWaterQualityStatus(undefined, lifted, now)).toBe('unchecked');
  });

  it('gives a known active restriction precedence over every retrieval state', () => {
    const checks: (WaterQualityCheck | undefined)[] = [
      undefined,
      { status: 'unmapped' },
      { status: 'unavailable', attemptedAt: now },
      { status: 'checked', checkedAt: now },
      { status: 'checked', checkedAt: now - MAX_WATER_QUALITY_AGE_MS },
      { status: 'checked', checkedAt: NaN },
    ];
    for (const check of checks)
      expect(getWaterQualityStatus(check, active, now)).toBe('restricted');
  });

  it('treats only an active restriction as known advice, not empty notice retrieval', () => {
    for (const status of unknown) expect(isWaterQualityUnknown(status)).toBe(true);
    expect(isWaterQualityUnknown('checked')).toBe(true);
    expect(isWaterQualityUnknown('restricted')).toBe(false);
  });
});

describe('Applying bathing-notice knowledge', () => {
  it('withholds great and ok recommendations for every unknown state', () => {
    for (const status of unknown) {
      for (const verdict of ['great', 'ok'] as const) {
        expect(applySwimWaterQuality({ ...good, verdict }, lifted, status)).toEqual({
          verdict: 'no',
          reason: waterQualityMessage(status),
          nearHighTide: true,
          withheld: 'water-quality-unknown',
        });
      }
    }
  });

  it('preserves real weather NO reasons through notice failure', () => {
    for (const bad of [
      { ...hour, weatherCode: 95 },
      { ...hour, waveHeightM: 1, windSpeedKmh: 40 },
    ]) {
      const result = assessSwimHour(bad, []);
      expect(result.verdict).toBe('no');
      for (const status of unknown)
        expect(applySwimWaterQuality(result, undefined, status)).toBe(result);
    }
  });

  it('updates a withheld result rather than treating it as a real weather hazard', () => {
    const withheld = applySwimWaterQuality(good, undefined, 'unchecked');
    expect(applySwimWaterQuality(withheld, undefined, 'unavailable').reason).toBe(
      waterQualityMessage('unavailable')
    );
  });

  it('always applies an active restriction, without the unknown marker', () => {
    for (const status of [...unknown, 'checked', 'restricted'] as WaterQualityStatus[]) {
      const result = applySwimWaterQuality(good, active, status);
      expect(result.verdict).toBe('no');
      expect(result.reason).toContain('restriction');
      expect(result.withheld).toBeUndefined();
    }
    expect(applySwimWaterQuality(good, undefined, 'restricted').verdict).toBe('no');
  });

  it.each(['2026-07-01T12:00:00Z', '2026-11-10T12:00:00Z'])(
    'does not infer water quality or swim permission from empty seasonal alerts on %s',
    (date) => {
      const at = Date.parse(date);
      const status = getWaterQualityStatus({ status: 'checked', checkedAt: at }, undefined, at);
      expect(status).toBe('not-reported');
      expect(applySwimWaterQuality(good, undefined, status)).toMatchObject({
        verdict: 'no',
        withheld: 'water-quality-unknown',
      });
      expect(waterQualityMessage(status)).toContain('in-season alerts');
      expect(waterQualityMessage(status)).toContain('Current water quality is unknown');
      expect(waterQualityMessage(status)).toContain('no dated water sample was checked');
    }
  );

  it('describes positive modeled conditions without encouraging entry', () => {
    for (const conditions of [hour, { ...hour, waveHeightM: 0.5, windSpeedKmh: 20 }]) {
      const result = assessSwimHour(conditions, [{ time: hour.time, kind: 'high', heightM: 1 }]);
      expect(result.reason).toContain('Modeled');
      expect(result.reason).not.toMatch(/lovely swim|in you get|grand for a dip|safe/i);
    }
  });
});
