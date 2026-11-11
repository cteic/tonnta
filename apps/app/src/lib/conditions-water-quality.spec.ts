import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchHourlyConditions,
  fetchTideEvents,
  fetchWaterQualityAlert,
  findSwimWindows,
  getSpot,
} from '@tonnta/data';
import type * as DataModule from '@tonnta/data';
import type { HourlyConditions, WaterQualityAlert, WaterQualityCheck } from '@tonnta/types';

import { loadSpotOutlook, retainKnownWaterQualityRestriction, swimOutlookAt } from './conditions';

vi.mock('@tonnta/data', async (importOriginal) => ({
  ...(await importOriginal<typeof DataModule>()),
  fetchHourlyConditions: vi.fn(),
  fetchTideEvents: vi.fn(),
  fetchWaterQualityAlert: vi.fn(),
}));

const now = Date.parse('2026-07-21T12:10:00Z');
function calmHoursAt(at: number): HourlyConditions[] {
  const midnight = new Date(at).setUTCHours(0, 0, 0, 0);
  return Array.from({ length: 36 }, (_, i) => ({
    time: new Date(midnight + i * 3_600_000).toISOString(),
    waveHeightM: 0.2,
    wavePeriodS: 5,
    waveDirectionDeg: 90,
    windSpeedKmh: 8,
    windGustKmh: 10,
    windDirectionDeg: 250,
    windState: 'offshore',
    seaTempC: 14,
  }));
}
const calmHours = calmHoursAt(now);
const beachId = getSpot('donabate')?.epaBeachId;
if (beachId === undefined) throw new Error('Donabate EPA mapping missing');
const activeRestriction: WaterQualityAlert = {
  beachId,
  beachName: 'Balcarrick, Donabate',
  restrictionInPlace: true,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  vi.mocked(fetchHourlyConditions).mockResolvedValue(calmHours);
  vi.mocked(fetchTideEvents).mockResolvedValue([]);
  vi.mocked(fetchWaterQualityAlert).mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});

describe('Native bathing-advice knowledge', () => {
  it.each(['2026-07-21T12:10:00Z', '2026-11-10T12:10:00Z'])(
    'withholds recommendations and windows after a successful empty seasonal response on %s',
    async (date) => {
      const at = Date.parse(date);
      vi.setSystemTime(at);
      vi.mocked(fetchHourlyConditions).mockResolvedValue(calmHoursAt(at));
      const outlook = await loadSpotOutlook();
      expect(outlook.waterQualityCheck).toEqual({ status: 'checked', checkedAt: at });
      expect(outlook.waterQualityStatus).toBe('not-reported');
      expect(outlook.swimNow.verdict).toBe('no');
      expect(outlook.swimNow.withheld).toBe('water-quality-unknown');
      expect(outlook.swimNow.reason).not.toMatch(/lovely swim|get in|perfect|grand/i);
      expect(outlook.swimWindows).toEqual([]);
      expect(outlook.currentHour).toMatchObject({
        waveHeightM: 0.2,
        windSpeedKmh: 8,
        seaTempC: 14,
      });
      expect(swimOutlookAt(outlook, at).swimNow.withheld).toBe('water-quality-unknown');
      expect(swimOutlookAt(outlook, at).swimWindows).toEqual([]);
    }
  );

  it('withholds positive advice on a failed EPA request and retains forecast measurements', async () => {
    vi.mocked(fetchWaterQualityAlert).mockRejectedValue(new Error('EPA unavailable'));
    const outlook = await loadSpotOutlook();
    expect(outlook.waterQualityCheck).toEqual({ status: 'unavailable', attemptedAt: now });
    expect(outlook.waterQualityStatus).toBe('unavailable');
    expect(outlook.swimNow.withheld).toBe('water-quality-unknown');
    expect(outlook.swimWindows).toEqual([]);
    expect(outlook.currentHour).toMatchObject({ waveHeightM: 0.2, windSpeedKmh: 8, seaTempC: 14 });
  });

  it('does not pretend an unmapped spot was checked', async () => {
    const outlook = await loadSpotOutlook('el-cotillo');
    expect(fetchWaterQualityAlert).not.toHaveBeenCalled();
    expect(outlook.waterQualityCheck).toEqual({ status: 'unmapped' });
    expect(outlook.waterQualityStatus).toBe('unmapped');
    expect(outlook.swimNow.withheld).toBe('water-quality-unknown');
    expect(outlook.swimWindows).toEqual([]);
  });

  it('expires a check on clock refresh without fetching again or renewing its timestamp', async () => {
    const outlook = await loadSpotOutlook();
    const refreshed = swimOutlookAt(outlook, now + 16 * 60_000);
    expect(refreshed.waterQualityStatus).toBe('stale');
    expect(refreshed.swimNow.withheld).toBe('water-quality-unknown');
    expect(refreshed.swimWindows).toEqual([]);
    expect(outlook.waterQualityCheck).toEqual({ status: 'checked', checkedAt: now });
    expect(fetchWaterQualityAlert).toHaveBeenCalledTimes(1);
  });

  it('does not renew a successful EPA check while waiting for a slow forecast', async () => {
    let finishForecast!: (hours: HourlyConditions[]) => void;
    vi.mocked(fetchHourlyConditions).mockReturnValue(
      new Promise((resolve) => {
        finishForecast = resolve;
      })
    );
    const pending = loadSpotOutlook();
    await Promise.resolve();
    await Promise.resolve();
    vi.setSystemTime(now + 16 * 60_000);
    finishForecast(calmHours);
    const outlook = await pending;
    expect(outlook.loadedAt).toBe(now + 16 * 60_000);
    expect(outlook.waterQualityCheck).toEqual({ status: 'checked', checkedAt: now });
    expect(outlook.waterQualityStatus).toBe('stale');
    expect(outlook.swimNow.withheld).toBe('water-quality-unknown');
    expect(outlook.swimWindows).toEqual([]);
  });

  it('records the EPA failure time rather than a later forecast completion time', async () => {
    let finishForecast!: (hours: HourlyConditions[]) => void;
    vi.mocked(fetchHourlyConditions).mockReturnValue(
      new Promise((resolve) => {
        finishForecast = resolve;
      })
    );
    vi.mocked(fetchWaterQualityAlert).mockRejectedValue(new Error('EPA unavailable'));
    const pending = loadSpotOutlook();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    vi.setSystemTime(now + 16 * 60_000);
    finishForecast(calmHours);
    const outlook = await pending;
    expect(outlook.waterQualityCheck).toEqual({ status: 'unavailable', attemptedAt: now });
    expect(outlook.waterQualityStatus).toBe('unavailable');
  });

  it('keeps an active restriction even when the EPA check expires', async () => {
    vi.mocked(fetchWaterQualityAlert).mockResolvedValue(activeRestriction);
    const outlook = await loadSpotOutlook();
    const refreshed = swimOutlookAt(outlook, now + 16 * 60_000);
    expect(refreshed.waterQualityStatus).toBe('restricted');
    expect(refreshed.swimNow.reason).toContain('restriction');
    expect(refreshed.swimNow.withheld).toBeUndefined();
    expect(refreshed.swimWindows).toEqual([]);
  });

  it('retains a known restriction through repeated failed refreshes for the same spot', async () => {
    vi.mocked(fetchWaterQualityAlert).mockResolvedValue(activeRestriction);
    const previous = await loadSpotOutlook();
    vi.mocked(fetchWaterQualityAlert).mockRejectedValue(new Error('EPA unavailable'));
    vi.setSystemTime(now + 16 * 60_000);
    const failed = await loadSpotOutlook();
    const retained = retainKnownWaterQualityRestriction(failed, previous, Date.now());
    expect(retained.waterQualityCheck?.status).toBe('unavailable');
    expect(retained.waterQualityStatus).toBe('restricted');
    expect(retained.swimNow.reason).toContain('restriction');
    expect(retained.swimNow.withheld).toBeUndefined();
    expect(retained.swimWindows).toEqual([]);
    expect(
      retainKnownWaterQualityRestriction(failed, retained, Date.now()).waterQualityStatus
    ).toBe('restricted');
  });

  it.each(['2026-07-21T12:10:00Z', '2026-11-10T12:10:00Z'])(
    'retains an active restriction after a successful empty seasonal response on %s',
    async (date) => {
      const at = Date.parse(date);
      vi.setSystemTime(at);
      vi.mocked(fetchHourlyConditions).mockResolvedValue(calmHoursAt(at));
      vi.mocked(fetchWaterQualityAlert).mockResolvedValue(activeRestriction);
      const previous = await loadSpotOutlook();
      vi.setSystemTime(at + 16 * 60_000);
      vi.mocked(fetchWaterQualityAlert).mockResolvedValue(undefined);
      const empty = await loadSpotOutlook();
      const retained = retainKnownWaterQualityRestriction(empty, previous, Date.now());
      expect(retained.waterQuality).toBe(previous.waterQuality);
      expect(retained.waterQualityStatus).toBe('restricted');
      expect(retained.swimNow.reason).toContain('restriction');
      expect(retained.swimNow.withheld).toBeUndefined();
      expect(retained.swimWindows).toEqual([]);
      expect(retained.waterQualityCheck).toEqual({ status: 'checked', checkedAt: Date.now() });
      expect(retained.loadedAt).toBe(empty.loadedAt);
      expect(retained.forecastHours).toBe(empty.forecastHours);
      expect(retainKnownWaterQualityRestriction(empty, retained, Date.now()).waterQuality).toBe(
        previous.waterQuality
      );
    }
  );

  it('clears a restriction only on a fresh explicit No for the same mapped beach, without granting swim clearance', async () => {
    vi.mocked(fetchWaterQualityAlert).mockResolvedValue(activeRestriction);
    const previous = await loadSpotOutlook();
    vi.mocked(fetchWaterQualityAlert).mockResolvedValue({
      ...activeRestriction,
      restrictionInPlace: false,
    });
    const lifted = await loadSpotOutlook();
    expect(retainKnownWaterQualityRestriction(lifted, previous, now)).toBe(lifted);
    expect(lifted.waterQualityStatus).toBe('not-reported');
    expect(lifted.swimNow.withheld).toBe('water-quality-unknown');
    expect(lifted.swimWindows).toEqual([]);
  });

  it('does not transfer a restriction to a different, unmapped spot', async () => {
    vi.mocked(fetchWaterQualityAlert).mockResolvedValue(activeRestriction);
    const previous = await loadSpotOutlook();
    const otherSpot = await loadSpotOutlook('el-cotillo');
    expect(retainKnownWaterQualityRestriction(otherSpot, previous, now)).toBe(otherSpot);
    expect(otherSpot.waterQualityStatus).toBe('unmapped');
  });

  it('does not clear a restriction using a No for another beach or a removed mapping', async () => {
    vi.mocked(fetchWaterQualityAlert).mockResolvedValue(activeRestriction);
    const previous = await loadSpotOutlook();
    vi.mocked(fetchWaterQualityAlert).mockResolvedValue({
      ...activeRestriction,
      beachId: 'another-beach',
      restrictionInPlace: false,
    });
    const otherBeach = await loadSpotOutlook();
    expect(retainKnownWaterQualityRestriction(otherBeach, previous, now).waterQuality).toBe(
      previous.waterQuality
    );
    vi.mocked(fetchWaterQualityAlert).mockResolvedValue({
      ...activeRestriction,
      restrictionInPlace: false,
    });
    const unmapped = await loadSpotOutlook();
    unmapped.spot = { ...unmapped.spot };
    delete unmapped.spot.epaBeachId;
    expect(retainKnownWaterQualityRestriction(unmapped, previous, now).waterQuality).toBe(
      previous.waterQuality
    );
  });

  it.each<WaterQualityCheck | undefined>([
    { status: 'checked', checkedAt: now - 15 * 60_000 },
    { status: 'checked', checkedAt: now + 1 },
    { status: 'checked', checkedAt: Number.NaN },
    { status: 'unavailable', attemptedAt: now },
    { status: 'unmapped' },
    undefined,
  ])(
    'does not clear a restriction using an explicit No with an invalid or stale check: %j',
    async (check) => {
      vi.mocked(fetchWaterQualityAlert).mockResolvedValue(activeRestriction);
      const previous = await loadSpotOutlook();
      vi.mocked(fetchWaterQualityAlert).mockResolvedValue({
        ...activeRestriction,
        restrictionInPlace: false,
      });
      const lifted = await loadSpotOutlook();
      if (check === undefined) delete lifted.waterQualityCheck;
      else lifted.waterQualityCheck = check;
      const retained = retainKnownWaterQualityRestriction(lifted, previous, now);
      expect(retained.waterQuality).toBe(previous.waterQuality);
      expect(retained.waterQualityCheck).toBe(check);
      expect(retained.waterQualityStatus).toBe('restricted');
      expect(retained.swimNow.reason).toContain('restriction');
      expect(retained.swimWindows).toEqual([]);
    }
  );

  it('retains real bad-weather advice alongside unknown water quality', async () => {
    vi.mocked(fetchHourlyConditions).mockResolvedValue(
      calmHours.map((hour) => ({ ...hour, waveHeightM: 2 }))
    );
    vi.mocked(fetchWaterQualityAlert).mockRejectedValue(new Error('EPA unavailable'));
    const outlook = await loadSpotOutlook();
    expect(outlook.waterQualityStatus).toBe('unavailable');
    expect(outlook.swimNow.verdict).toBe('no');
    expect(outlook.swimNow.reason).toContain('2.0m');
    expect(outlook.swimNow.withheld).toBeUndefined();
  });

  it('does not revive positive first-light advice after an empty seasonal response', async () => {
    vi.setSystemTime(Date.parse('2026-07-21T00:10:00Z'));
    const outlook = await loadSpotOutlook();
    expect(outlook.headline.kind).toBe('dark');
    expect(outlook.waterQualityStatus).toBe('not-reported');
    expect(outlook.swimFirstLight?.withheld).toBe('water-quality-unknown');
    expect(swimOutlookAt(outlook, Date.now()).swimFirstLight?.withheld).toBe(
      'water-quality-unknown'
    );
  });

  it.each(['not-reported', 'checked'] as const)(
    'discards stored positive advice and windows for notice-only %s outlooks',
    async (status) => {
      const outlook = await loadSpotOutlook();
      outlook.waterQualityStatus = status;
      outlook.swimNow = { verdict: 'great', reason: 'Lovely swim', nearHighTide: false };
      outlook.swimWindows = findSwimWindows(calmHours, outlook.tides, outlook.spot, now);
      expect(outlook.swimWindows.length).toBeGreaterThan(0);
      const refreshed = swimOutlookAt(outlook, now);
      expect(refreshed.waterQualityStatus).toBe('not-reported');
      expect(refreshed.swimNow.verdict).toBe('no');
      expect(refreshed.swimNow.withheld).toBe('water-quality-unknown');
      expect(refreshed.swimNow.reason).not.toContain('Lovely swim');
      expect(refreshed.swimWindows).toEqual([]);
      expect(outlook.waterQualityCheck).toEqual({ status: 'checked', checkedAt: now });
    }
  );

  it('treats older stored outlooks with no check metadata as unchecked', async () => {
    const outlook = await loadSpotOutlook();
    delete outlook.waterQualityCheck;
    expect(swimOutlookAt(outlook, now).waterQualityStatus).toBe('unchecked');
    expect(swimOutlookAt(outlook, now).swimNow.withheld).toBe('water-quality-unknown');
  });
});

function paginatedEpaResponse(list: unknown[], page: number, count: number) {
  return new Response(JSON.stringify({ count, length: 50, page, list }));
}
const localNoFirstPage = Array.from({ length: 50 }, (_, i) => ({
  incident_id: i + 1,
  beach_id: i === 0 ? beachId : `other-${i}`,
  has_bathing_restriction_in_place: 'No',
}));

describe('Native source pagination and restriction retention', () => {
  it('recognizes a target active restriction found only on page two', async () => {
    const actual = await vi.importActual<typeof DataModule>('@tonnta/data');
    vi.mocked(fetchWaterQualityAlert).mockImplementationOnce(actual.fetchWaterQualityAlert);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(paginatedEpaResponse(localNoFirstPage, 1, 51))
        .mockResolvedValueOnce(
          paginatedEpaResponse(
            [{ incident_id: 51, beach_id: beachId, has_bathing_restriction_in_place: 'Yes' }],
            2,
            51
          )
        )
    );
    const result = await loadSpotOutlook('donabate');
    expect(result.waterQualityStatus).toBe('restricted');
    expect(result.swimNow.reason).toContain('bathing restriction');
    expect(result.swimWindows).toEqual([]);
  });

  it('does not clear a prior restriction from page-one No when page two fails', async () => {
    vi.mocked(fetchWaterQualityAlert).mockResolvedValueOnce(activeRestriction);
    const previous = await loadSpotOutlook('donabate');
    const actual = await vi.importActual<typeof DataModule>('@tonnta/data');
    vi.mocked(fetchWaterQualityAlert).mockImplementationOnce(actual.fetchWaterQualityAlert);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(paginatedEpaResponse(localNoFirstPage, 1, 51))
        .mockRejectedValueOnce(new Error('Page two network failure'))
    );
    const downloaded = await loadSpotOutlook('donabate');
    expect(downloaded.waterQualityStatus).toBe('unavailable');
    expect(downloaded.waterQuality).toBeUndefined();
    const retained = retainKnownWaterQualityRestriction(downloaded, previous, Date.now());
    expect(retained.waterQualityStatus).toBe('restricted');
    expect(retained.waterQuality).toBe(previous.waterQuality);
    expect(retained.swimWindows).toEqual([]);
  });
});
