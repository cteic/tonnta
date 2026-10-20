import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it, vi } from 'vitest';

import { assessHour, currentHour, fetchHourlyConditions, getSpot } from '@tonnta/data';

import type { ForecastCache } from './surf-verdict';
import { surfVerdict } from './surf-verdict';

const feature = await loadFeature('./surf-verdict.feature');
const NOW = Date.parse('2026-10-20T12:30:00Z');

function memoryCache(): ForecastCache {
  const values = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => values.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

function forecastFetch(time = '2026-10-20T12:00') {
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.includes('marine-api')) {
      return Response.json({
        hourly: {
          time: [time],
          wave_height: [0.7],
          wave_period: [8],
          wave_direction: [70],
          sea_surface_temperature: [14],
        },
      });
    }
    return Response.json({
      hourly: {
        time: [time],
        wind_speed_10m: [8],
        wind_direction_10m: [250],
        wind_gusts_10m: [10],
      },
    });
  });
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'A current forecast returns the existing verdict explanation',
    ({ Given, When, Then }) => {
      let fetchImpl = forecastFetch();
      let result: Awaited<ReturnType<typeof surfVerdict>> | undefined;
      Given('a forecast covering the current hour', () => {
        fetchImpl = forecastFetch();
      });
      When('I ask for the surf verdict', async () => {
        result = await surfVerdict(memoryCache(), NOW, fetchImpl);
      });
      Then('I receive the verdict and its unchanged explanation', async () => {
        const spot = getSpot('donabate');
        if (!spot) throw new Error('Missing test spot');
        const expected = assessHour(
          currentHour(await fetchHourlyConditions(spot, forecastFetch()), NOW),
          spot
        );
        expect(result).toEqual({ spot: 'donabate', time: '2026-10-20T12:00:00Z', ...expected });
      });
    }
  );
  Scenario('Repeated requests use the forecast cache', ({ Given, When, Then }) => {
    let fetchImpl = forecastFetch();
    Given('a forecast covering the current hour', () => {
      fetchImpl = forecastFetch();
    });
    When('I ask for the surf verdict twice', async () => {
      const cache = memoryCache();
      await surfVerdict(cache, NOW, fetchImpl);
      await surfVerdict(cache, NOW, fetchImpl);
    });
    Then('the forecast source is fetched only once', () => {
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });
  });
  Scenario("An expired forecast cannot answer today's question", ({ Given, When, Then }) => {
    let fetchImpl = forecastFetch();
    let failed = false;
    Given('a forecast that ended yesterday', () => {
      fetchImpl = forecastFetch('2026-10-19T12:00');
    });
    When('I ask for the surf verdict', async () => {
      try {
        await surfVerdict(memoryCache(), NOW, fetchImpl);
      } catch {
        failed = true;
      }
    });
    Then('the request fails without a stale verdict', () => {
      expect(failed).toBe(true);
    });
  });
});

describe('forecast cache failures', () => {
  it('rejects malformed cache entries and replaces them with a live result', async () => {
    const cache = memoryCache();
    vi.mocked(cache.get).mockResolvedValue('{broken');
    const result = await surfVerdict(cache, NOW, forecastFetch());
    expect(result.spot).toBe('donabate');
    expect(cache.put).toHaveBeenCalledWith(expect.any(String), JSON.stringify(result), {
      expirationTtl: 300,
    });
  });
  it('still returns a current forecast when KV cannot be read or written', async () => {
    const cache = memoryCache();
    vi.mocked(cache.get).mockRejectedValue(new Error('KV unavailable'));
    vi.mocked(cache.put).mockRejectedValue(new Error('KV unavailable'));
    expect((await surfVerdict(cache, NOW, forecastFetch())).time).toBe('2026-10-20T12:00:00Z');
  });
  it('does not retain a verdict across the next hour', async () => {
    const cache = memoryCache();
    await surfVerdict(cache, NOW, forecastFetch());
    const fetchImpl = forecastFetch('2026-10-20T13:00');
    await surfVerdict(cache, NOW + 60 * 60 * 1000, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  it('rejects a forecast that only starts in the future', async () => {
    await expect(
      surfVerdict(memoryCache(), NOW, forecastFetch('2026-10-20T13:00'))
    ).rejects.toThrow('current hour');
  });
  it('propagates upstream failures instead of inventing a verdict', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response(null, { status: 503 }));
    await expect(surfVerdict(memoryCache(), NOW, fetchImpl)).rejects.toThrow('503');
  });
});
