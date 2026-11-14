import { describe, expect, it } from 'vitest';

import { getSpot, spotThresholds } from '@tonnta/data';
import type { HourlyConditions } from '@tonnta/types';

import {
  FORECAST_STORAGE_BUDGET_BYTES,
  FORECAST_STORAGE_KEY,
  captureForecastSnapshots,
  matchForecastSnapshot,
  parseForecastSnapshot,
  persistForecastSnapshots,
  readForecastSnapshots,
} from './forecast-snapshots';
import type { CaptureForecastInput, LocalStorageLike } from './forecast-snapshots';

const HOUR: HourlyConditions = {
  time: '2026-11-09T12:00:00.000Z',
  waveHeightM: 0.6,
  wavePeriodS: 5,
  waveDirectionDeg: 80,
  windSpeedKmh: 10,
  windGustKmh: 15,
  windDirectionDeg: 250,
  windState: 'offshore',
  seaTempC: 12,
};
function input(overrides: Partial<CaptureForecastInput> = {}): CaptureForecastInput {
  return {
    spotId: 'donabate',
    checkedAt: Date.parse('2026-11-09T10:00Z'),
    capturedAt: Date.parse('2026-11-09T10:01Z'),
    engineVersion: 'test-v1',
    hours: [
      {
        hour: HOUR,
        verdict: { verdict: 'go', reason: 'Exact original reason.', board: 'longboard' },
      },
    ],
    ...overrides,
  };
}
function store(): LocalStorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

async function snapshot(overrides: Partial<CaptureForecastInput> = {}) {
  const result = (await captureForecastSnapshots(input(overrides)))[0];
  if (result === undefined) throw new Error('Missing fixture');
  return result;
}

describe('immutable saved hourly forecasts', () => {
  it('retains exact inputs, separate timestamps, effective configuration and verdict', async () => {
    const saved = await snapshot();
    expect(saved.hour).toEqual(HOUR);
    expect(saved.verdict).toEqual(input().hours[0]?.verdict);
    expect(saved.checkedAt).toBe('2026-11-09T10:00:00.000Z');
    expect(saved.capturedAt).toBe('2026-11-09T10:01:00.000Z');
    const spot = getSpot('donabate');
    if (spot === undefined) throw new Error('Missing spot');
    expect(saved.configuration.thresholds).toEqual(spotThresholds(spot));
    expect(saved).not.toHaveProperty('issuedAt');
  });
  it('uses stable content identities while preserving the first capture', async () => {
    const first = await snapshot();
    const later = await snapshot({ capturedAt: Date.parse('2026-11-09T11:00Z') });
    expect(later.id).toBe(first.id);
    const storage = store();
    expect(persistForecastSnapshots(storage, [first]).ok).toBe(true);
    expect(persistForecastSnapshots(storage, [later]).ok).toBe(true);
    expect(readForecastSnapshots(storage)).toEqual({ ok: true, value: [first] });
    expect((await snapshot({ engineVersion: 'test-v2' })).id).not.toBe(first.id);
  });
  it('matches only the same beach and containing hour before the visit', async () => {
    const saved = await snapshot();
    expect(matchForecastSnapshot([saved], 'donabate', '2026-11-09T12:30Z')).toEqual(saved);
    expect(matchForecastSnapshot([saved], 'el-cotillo', '2026-11-09T12:30Z')).toBeUndefined();
    expect(matchForecastSnapshot([saved], 'donabate', '2026-11-09T13:00Z')).toBeUndefined();
    const after = await snapshot({
      checkedAt: Date.parse('2026-11-09T12:31Z'),
      capturedAt: Date.parse('2026-11-09T12:32Z'),
    });
    expect(matchForecastSnapshot([after], 'donabate', '2026-11-09T12:30Z')).toBeUndefined();
  });
  it('does not confuse later capture of older checked data with pre-visit evidence', async () => {
    const saved = await snapshot({ capturedAt: Date.parse('2026-11-09T12:40Z') });
    expect(matchForecastSnapshot([saved], 'donabate', '2026-11-09T12:30Z')).toBeUndefined();
  });
  it('surfaces storage failures without overwriting unreadable history', async () => {
    const storage = store();
    storage.setItem(FORECAST_STORAGE_KEY, 'bad json');
    expect(persistForecastSnapshots(storage, [await snapshot()]).ok).toBe(false);
    expect(storage.getItem(FORECAST_STORAGE_KEY)).toBe('bad json');
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(persistForecastSnapshots(broken, [await snapshot()]).ok).toBe(false);
  });
  it('bounds serialized history and evicts oldest records before reserving report space', async () => {
    const base = await snapshot();
    const many = Array.from({ length: 1200 }, (_, index) => ({
      ...base,
      id: index.toString(16).padStart(64, '0'),
      capturedAt: new Date(Date.parse(base.capturedAt) + index * 60_000).toISOString(),
      verdict: { ...base.verdict, reason: 'x'.repeat(2000) },
    }));
    const storage = store();
    expect(persistForecastSnapshots(storage, many).ok).toBe(true);
    const raw = storage.getItem(FORECAST_STORAGE_KEY) ?? '';
    expect(raw.length * 2).toBeLessThanOrEqual(FORECAST_STORAGE_BUDGET_BYTES);
    const result = readForecastSnapshots(storage);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.length).toBeLessThan(many.length);
    expect(result.value[0]?.id).toBe(many.at(-1)?.id);
  });
  it('recovers from quota failures with bounded oldest eviction', async () => {
    const base = await snapshot();
    const snapshots = Array.from({ length: 6 }, (_, index) => ({
      ...base,
      id: index.toString(16).padStart(64, '0'),
      capturedAt: new Date(Date.parse(base.capturedAt) + index * 60_000).toISOString(),
    }));
    let raw: string | null = null;
    let writes = 0;
    const storage = {
      getItem: () => raw,
      setItem: (_key: string, value: string) => {
        writes += 1;
        if ((JSON.parse(value) as unknown[]).length > 2)
          throw new DOMException('Full', 'QuotaExceededError');
        raw = value;
      },
    };
    expect(persistForecastSnapshots(storage, snapshots).ok).toBe(true);
    expect(writes).toBe(3);
    const result = readForecastSnapshots(storage);
    if (!result.ok) throw new Error(result.error);
    expect(result.value.map((item) => item.id)).toEqual([snapshots[5]?.id]);
  });
  it('does not retry denied storage access or overwrite malformed records', async () => {
    let writes = 0;
    const denied = {
      getItem: () => null,
      setItem: () => {
        writes += 1;
        throw new DOMException('Denied', 'SecurityError');
      },
    };
    expect(persistForecastSnapshots(denied, [await snapshot()]).ok).toBe(false);
    expect(writes).toBe(1);
    const storage = store();
    storage.setItem(FORECAST_STORAGE_KEY, '[{"broken":true}]');
    expect(persistForecastSnapshots(storage, [await snapshot()]).ok).toBe(false);
    expect(storage.getItem(FORECAST_STORAGE_KEY)).toBe('[{"broken":true}]');
  });
  it('rejects malformed input, non-finite numbers and impossible chronology', async () => {
    const saved = await snapshot();
    expect(
      parseForecastSnapshot({ ...saved, hour: { ...saved.hour, waveHeightM: Infinity } })
    ).toBeUndefined();
    expect(parseForecastSnapshot({ ...saved, checkedAt: '2026-11-10T12:00:00Z' })).toBeUndefined();
    expect(parseForecastSnapshot({ ...saved, configuration: undefined })).toBeUndefined();
  });
});
