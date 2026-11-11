import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchBuoyObservation,
  fetchHourlyConditions,
  fetchTideEvents,
  fetchWaterQualityAlert,
  getSpot,
} from '@tonnta/data';
import type * as DataModule from '@tonnta/data';
import type { HourlyConditions } from '@tonnta/types';

import { loadSpotConditions } from './conditions';
import { conditionsAt } from './live-conditions';

vi.mock('@tonnta/data', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  fetchHourlyConditions: vi.fn(),
  fetchTideEvents: vi.fn(),
  fetchBuoyObservation: vi.fn(),
  fetchWaterQualityAlert: vi.fn(),
}));
const start = Date.parse('2026-07-01T00:00:00Z');
const hours: HourlyConditions[] = Array.from({ length: 48 }, (_, i) => ({
  time: new Date(start + i * 3_600_000).toISOString(),
  waveHeightM: 0.2,
  wavePeriodS: 5,
  waveDirectionDeg: 90,
  windSpeedKmh: 8,
  windGustKmh: 12,
  windDirectionDeg: 270,
  windState: 'offshore',
  seaTempC: 18,
}));
const restriction = {
  beachId: 'IEEABWC020_0000_0100',
  beachName: 'Donabate',
  restrictionInPlace: true,
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start + 12 * 3_600_000);
  vi.clearAllMocks();
  vi.mocked(fetchHourlyConditions).mockResolvedValue(hours);
  vi.mocked(fetchTideEvents).mockResolvedValue([]);
  vi.mocked(fetchBuoyObservation).mockResolvedValue(undefined);
  vi.mocked(fetchWaterQualityAlert).mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Shared swim loader restriction guarantees', () => {
  it('overrides the current calm-water verdict and suppresses windows during a restriction', async () => {
    vi.mocked(fetchWaterQualityAlert).mockResolvedValue(restriction);
    const value = await loadSpotConditions('donabate');
    expect(value.swimNow.verdict).toBe('no');
    expect(value.swimNow.reason).toContain('bathing restriction');
    expect(value.swimWindows).toEqual([]);
    const refreshed = conditionsAt(value, Date.now() + 60_000);
    expect(refreshed.swimNow.verdict).toBe('no');
    expect(refreshed.swimWindows).toEqual([]);
  });
  it('also carries the restriction into first-light advice and clock refresh', async () => {
    vi.setSystemTime(start);
    vi.mocked(fetchWaterQualityAlert).mockResolvedValue(restriction);
    const value = await loadSpotConditions('donabate');
    expect(value.headline.kind).toBe('dark');
    expect(value.swimFirstLight?.verdict).toBe('no');
    expect(value.swimFirstLight?.reason).toContain('bathing restriction');
    expect(conditionsAt(value, start + 60_000).swimFirstLight?.verdict).toBe('no');
  });
  it('drops windows when forecast data fails rather than reusing another hour', async () => {
    vi.mocked(fetchHourlyConditions).mockRejectedValue(new Error('forecast unavailable'));
    const value = await loadSpotConditions('donabate');
    expect(value.headline.kind).toBe('none');
    expect(value.swimWindows).toEqual([]);
    expect(value.swimNow.verdict).toBe('no');
    expect(value.warnings.join(' ')).toContain('wave forecast');
  });
});

describe('Explicit bathing-notice knowledge', () => {
  it.each(['EPA HTTP 503', 'EPA unexpected response shape'])(
    'withholds positive advice after %s',
    async (message) => {
      vi.mocked(fetchWaterQualityAlert).mockRejectedValue(new Error(message));
      const value = await loadSpotConditions('donabate');
      expect(value.waterQuality).toBeUndefined();
      expect(value.waterQualityStatus).toBe('unavailable');
      expect(value.warnings.join(' ')).toContain('bathing-notice check failed');
      expect(value.swimNow).toMatchObject({ verdict: 'no', withheld: 'water-quality-unknown' });
      expect(value.swimWindows).toEqual([]);
      expect(conditionsAt(value, Date.now() + 60_000).swimNow.withheld).toBe(
        'water-quality-unknown'
      );
    }
  );
  it('distinguishes an unmapped beach from a checked source with no incident', async () => {
    const value = await loadSpotConditions('el-cotillo');
    expect(fetchWaterQualityAlert).not.toHaveBeenCalled();
    expect(value.waterQualityStatus).toBe('unmapped');
    expect(value.warnings.join(' ')).toContain('No official bathing-notice feed');
    expect(value.swimNow.withheld).toBe('water-quality-unknown');
    expect(value.swimWindows).toEqual([]);
  });
  it('retains physical measurements but withholds advice after a successful empty seasonal check', async () => {
    const value = await loadSpotConditions('donabate');
    expect(fetchWaterQualityAlert).toHaveBeenCalledOnce();
    expect(value.waterQuality).toBeUndefined();
    expect(value.waterQualityStatus).toBe('not-reported');
    expect(value.waterQualityCheck).toEqual({ status: 'checked', checkedAt: Date.now() });
    expect(value.swimNow).toMatchObject({ verdict: 'no', withheld: 'water-quality-unknown' });
    expect(value.currentHour?.waveHeightM).toBe(0.2);
    expect(value.swimNow.reason).not.toMatch(/lovely swim|in you get|grand for a dip/i);
    expect(value.swimWindows).toEqual([]);
  });
  it('requires an uncached EPA retrieval rather than relabeling a cached response fresh', async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({ list: [] })));
    vi.stubGlobal('fetch', upstream);
    await loadSpotConditions('donabate');
    const fetchImpl = vi.mocked(fetchWaterQualityAlert).mock.calls[0]?.[1];
    expect(fetchImpl).toBeTypeOf('function');
    await fetchImpl?.('https://data.epa.ie/bw/api/v1/alerts');
    expect(upstream).toHaveBeenCalledWith('https://data.epa.ie/bw/api/v1/alerts', {
      cache: 'no-store',
    });
  });
  it('turns an actual malformed EPA incident into unknown at the loader boundary', async () => {
    const actual = await vi.importActual<typeof DataModule>('@tonnta/data');
    vi.mocked(fetchWaterQualityAlert).mockImplementationOnce(actual.fetchWaterQualityAlert);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ list: [null] })))
    );
    const value = await loadSpotConditions('donabate');
    expect(value.waterQualityStatus).toBe('unavailable');
    expect(value.swimNow.withheld).toBe('water-quality-unknown');
    expect(value.swimWindows).toEqual([]);
  });
  it('keeps an actual active EPA restriction even beside malformed rows', async () => {
    const actual = await vi.importActual<typeof DataModule>('@tonnta/data');
    vi.mocked(fetchWaterQualityAlert).mockImplementationOnce(actual.fetchWaterQualityAlert);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            list: [
              null,
              {
                beach_id: getSpot('donabate')?.epaBeachId,
                has_bathing_restriction_in_place: 'Yes',
              },
            ],
          })
        )
      )
    );
    const value = await loadSpotConditions('donabate');
    expect(value.waterQualityStatus).toBe('restricted');
    expect(value.swimNow.reason).toContain('bathing restriction');
    expect(value.swimNow.withheld).toBeUndefined();
    expect(value.swimWindows).toEqual([]);
  });
  it('keeps a successful empty winter response unknown even with a calm November forecast', async () => {
    const at = Date.parse('2026-11-10T12:00:00Z');
    vi.setSystemTime(at);
    vi.mocked(fetchHourlyConditions).mockResolvedValue(
      hours.map((hour, i) => ({ ...hour, time: new Date(at + (i - 12) * 3_600_000).toISOString() }))
    );
    const value = await loadSpotConditions('donabate');
    expect(value.waterQualityStatus).toBe('not-reported');
    expect(value.swimNow).toMatchObject({ verdict: 'no', withheld: 'water-quality-unknown' });
    expect(value.swimWindows).toEqual([]);
    expect(value.currentHour?.waveHeightM).toBe(0.2);
  });
  it('expires notice knowledge without refreshing its original timestamp', async () => {
    const value = await loadSpotConditions('donabate');
    expect(conditionsAt(value, Date.now() + 899_999).waterQualityStatus).toBe('not-reported');
    const stale = conditionsAt(value, Date.now() + 900_000);
    expect(stale.waterQualityStatus).toBe('stale');
    expect(stale.swimWindows).toEqual([]);
    expect(stale.swimNow.withheld).toBe('water-quality-unknown');
    expect(stale.waterQualityCheck).toEqual(value.waterQualityCheck);
    expect(stale.currentHour).toBeDefined();
  });
  it('does not let an old active restriction expire into unknown or positive advice', async () => {
    vi.mocked(fetchWaterQualityAlert).mockResolvedValue(restriction);
    const value = await loadSpotConditions('donabate');
    const stale = conditionsAt(value, Date.now() + 900_000);
    expect(stale.waterQualityStatus).toBe('restricted');
    expect(stale.swimNow.verdict).toBe('no');
    expect(stale.swimNow.withheld).toBeUndefined();
    expect(stale.swimWindows).toEqual([]);
  });
  it('withholds first-light advice when the notice source failed', async () => {
    vi.setSystemTime(start);
    vi.mocked(fetchWaterQualityAlert).mockRejectedValue(new Error('EPA down'));
    const value = await loadSpotConditions('donabate');
    expect(value.headline.kind).toBe('dark');
    expect(value.swimFirstLight?.withheld).toBe('water-quality-unknown');
  });
  it('recovers notice retrieval without pretending current water quality is known', async () => {
    vi.mocked(fetchWaterQualityAlert).mockRejectedValueOnce(new Error('EPA down'));
    const failed = await loadSpotConditions('donabate');
    vi.setSystemTime(Date.now() + 60_000);
    const recovered = await loadSpotConditions('donabate');
    expect(failed.waterQualityStatus).toBe('unavailable');
    expect(recovered.waterQualityStatus).toBe('not-reported');
    expect(recovered.swimNow.verdict).toBe('no');
    expect(recovered.swimNow.withheld).toBe('water-quality-unknown');
  });
  it('does not renew a completed notice retrieval while waiting for another source', async () => {
    let release: ((value: HourlyConditions[]) => void) | undefined;
    vi.mocked(fetchHourlyConditions).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    const at = Date.now();
    const loading = loadSpotConditions('donabate');
    await Promise.resolve();
    await Promise.resolve();
    vi.setSystemTime(at + 1_200_000);
    release?.(hours);
    const value = await loading;
    expect(value.waterQualityCheck).toEqual({ status: 'checked', checkedAt: at });
    expect(value.waterQualityStatus).toBe('stale');
    expect(value.swimNow.withheld).toBe('water-quality-unknown');
  });
});

function epaPage(list: unknown[], page: number, count: number) {
  return new Response(JSON.stringify({ count, length: 50, page, list }));
}
function firstEpaPageWithLocalNo() {
  return Array.from({ length: 50 }, (_, i) => ({
    incident_id: i + 1,
    beach_id: i === 0 ? restriction.beachId : `other-beach-${i}`,
    has_bathing_restriction_in_place: 'No',
  }));
}

describe('Paginated EPA source through the shared loader', () => {
  it('finds the target restriction on page two even after a local No on page one', async () => {
    const actual = await vi.importActual<typeof DataModule>('@tonnta/data');
    vi.mocked(fetchWaterQualityAlert).mockImplementationOnce(actual.fetchWaterQualityAlert);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(epaPage(firstEpaPageWithLocalNo(), 1, 51))
      .mockResolvedValueOnce(
        epaPage(
          [
            {
              incident_id: 51,
              beach_id: restriction.beachId,
              has_bathing_restriction_in_place: 'Yes',
            },
          ],
          2,
          51
        )
      );
    vi.stubGlobal('fetch', fetch);
    const result = await loadSpotConditions('donabate');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.waterQualityStatus).toBe('restricted');
    expect(result.swimNow.reason).toContain('bathing restriction');
    expect(result.swimWindows).toEqual([]);
  });

  it.each(['http', 'short', 'duplicate'] as const)(
    'marks a %s second page unavailable rather than accepting the earlier No',
    async (failure) => {
      const actual = await vi.importActual<typeof DataModule>('@tonnta/data');
      vi.mocked(fetchWaterQualityAlert).mockImplementationOnce(actual.fetchWaterQualityAlert);
      let second = new Response('{}', { status: 503 });
      if (failure === 'short') second = epaPage([], 2, 51);
      if (failure === 'duplicate') second = epaPage([firstEpaPageWithLocalNo()[0]], 2, 51);
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(epaPage(firstEpaPageWithLocalNo(), 1, 51))
          .mockResolvedValueOnce(second)
      );
      const result = await loadSpotConditions('donabate');
      expect(result.waterQualityCheck?.status).toBe('unavailable');
      expect(result.waterQualityStatus).toBe('unavailable');
      expect(result.waterQuality).toBeUndefined();
      expect(result.swimNow.withheld).toBe('water-quality-unknown');
      expect(result.swimWindows).toEqual([]);
    }
  );

  it('records only complete paginated no-notice retrieval, without a quality clearance', async () => {
    const actual = await vi.importActual<typeof DataModule>('@tonnta/data');
    vi.mocked(fetchWaterQualityAlert).mockImplementationOnce(actual.fetchWaterQualityAlert);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(epaPage(firstEpaPageWithLocalNo(), 1, 51))
        .mockResolvedValueOnce(
          epaPage(
            [
              {
                incident_id: 51,
                beach_id: 'other-final-beach',
                has_bathing_restriction_in_place: 'No',
              },
            ],
            2,
            51
          )
        )
    );
    const result = await loadSpotConditions('donabate');
    expect(result.waterQualityCheck?.status).toBe('checked');
    expect(result.waterQualityStatus).toBe('not-reported');
    expect(result.waterQuality?.restrictionInPlace).toBe(false);
    expect(result.swimNow.withheld).toBe('water-quality-unknown');
    expect(result.swimWindows).toEqual([]);
  });
});
