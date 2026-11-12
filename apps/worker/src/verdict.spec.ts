import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SPOT_ID,
  SURF_VERDICT_ENGINE_VERSION,
  assessHour,
  getSpot,
  isDaylightHour,
  sunTimes,
} from '@tonnta/data';
import type { HourlyConditions, Spot } from '@tonnta/types';

import type { VerdictCache, VerdictTimeline } from './verdict';
import { buildTimeline, handleVerdict, isVerdictTimeline, verdictTimeline } from './verdict';

const feature = await loadFeature('./verdict.feature');

const MIDNIGHT = Date.parse('2026-10-20T00:00:00Z');
const NOW = Date.parse('2026-10-20T09:20:00Z');
const HOUR_MS = 60 * 60 * 1000;
const FORECAST_HOURS = 7 * 24;

function launchSpot(): Spot {
  const spot = getSpot(DEFAULT_SPOT_ID);
  if (spot === undefined) throw new Error('launch spot missing');
  return spot;
}

/** Varied conditions so the timeline crosses more than one verdict. */
function forecastHours(): HourlyConditions[] {
  return Array.from({ length: FORECAST_HOURS }, (_, index) => ({
    time: new Date(MIDNIGHT + index * HOUR_MS).toISOString().replace('.000Z', 'Z'),
    waveHeightM: 0.2 + (index % 10) * 0.1,
    wavePeriodS: 4 + (index % 5),
    waveDirectionDeg: 70,
    windSpeedKmh: 5 + (index % 8) * 5,
    windGustKmh: 10 + (index % 8) * 6,
    windDirectionDeg: (index * 37) % 360,
    windState: 'cross',
  }));
}

/** Open-Meteo payloads for the same hours, routed by URL as the real client calls them. */
function fakeOpenMeteo(calls: string[], wavePeriodS?: number): typeof fetch {
  const times = Array.from({ length: FORECAST_HOURS }, (_, index) =>
    new Date(MIDNIGHT + index * HOUR_MS).toISOString().slice(0, 16)
  );
  const pick = (fn: (index: number) => number) => times.map((_, index) => fn(index));
  return async (input) => {
    const url = String(input);
    calls.push(url);
    const hourly = url.includes('marine')
      ? {
          time: times,
          wave_height: pick((i) => 0.2 + (i % 10) * 0.1),
          wave_period: pick((i) => wavePeriodS ?? 4 + (i % 5)),
          wave_direction: pick(() => 70),
          sea_surface_temperature: pick(() => 13),
        }
      : {
          time: times,
          wind_speed_10m: pick((i) => 5 + (i % 8) * 5),
          wind_direction_10m: pick((i) => (i * 37) % 360),
          wind_gusts_10m: pick((i) => 10 + (i % 8) * 6),
        };
    return new Response(JSON.stringify({ hourly }), { status: 200 });
  };
}

function failingFetch(calls: string[]): typeof fetch {
  return async (input) => {
    calls.push(String(input));
    return new Response('upstream down', { status: 503 });
  };
}

function memoryCache(): VerdictCache & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

const CURRENT_HOUR_KEY = `verdict:v2:${SURF_VERDICT_ENGINE_VERSION}:evidence-1:donabate-v1:donabate:2026-10-20T09`;

async function readTimeline(response: Response): Promise<VerdictTimeline> {
  const body: unknown = await response.json();
  if (!isVerdictTimeline(body)) throw new Error('response is not a verdict timeline');
  return body;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'The timeline starts at the current hour and covers a day',
    ({ Given, When, Then, And }) => {
      let hours: HourlyConditions[] = [];
      let timeline: VerdictTimeline | undefined;

      Given('a seven-day forecast that began at midnight', () => {
        hours = forecastHours();
      });
      When('I build the timeline at 09:20', () => {
        timeline = buildTimeline(hours, launchSpot(), NOW);
      });
      Then('the first hour is 09:00', () => {
        expect(timeline?.hours[0]?.time).toBe('2026-10-20T09:00:00Z');
      });
      And('the timeline has 24 hours', () => {
        expect(timeline?.hours).toHaveLength(24);
      });
    }
  );

  Scenario("Every hour carries the verdict engine's own result", ({ Given, When, Then }) => {
    let hours: HourlyConditions[] = [];
    let timeline: VerdictTimeline | undefined;

    Given('a seven-day forecast that began at midnight', () => {
      hours = forecastHours();
    });
    When('I build the timeline at 09:20', () => {
      timeline = buildTimeline(hours, launchSpot(), NOW);
    });
    Then("each hour's verdict, board and reason match the verdict engine", () => {
      const spot = launchSpot();
      const byTime = new Map(hours.map((hour) => [hour.time, hour]));
      for (const entry of timeline?.hours ?? []) {
        const source = byTime.get(entry.time);
        if (source === undefined) throw new Error(`no source hour for ${entry.time}`);
        const expected = isDaylightHour(source.time, spot)
          ? assessHour(source, spot)
          : {
              verdict: 'dark',
              board: undefined,
              reason: 'Outside a full daylight hour. Stay out of the water.',
            };
        expect(entry.verdict).toBe(expected.verdict);
        expect(entry.board).toBe(expected.board);
        expect(entry.reason).toBe(expected.reason);
      }
      expect(new Set(timeline?.hours.map((entry) => entry.verdict)).size).toBeGreaterThan(1);
    });
  });

  Scenario(
    'A cached timeline for the same hour is served without a forecast fetch',
    ({ Given, When, Then, And }) => {
      const cache = memoryCache();
      const calls: string[] = [];
      let cached: VerdictTimeline | undefined;
      let response: Response | undefined;

      Given('a timeline cached for the current hour', () => {
        cached = buildTimeline(forecastHours(), launchSpot(), NOW);
        cache.store.set(CURRENT_HOUR_KEY, JSON.stringify(cached));
      });
      When('the widget asks for the verdict', async () => {
        response = await handleVerdict(
          new URL('https://worker.test/verdict'),
          cache,
          NOW,
          fakeOpenMeteo(calls)
        );
      });
      Then('the response is the cached timeline', async () => {
        if (response === undefined) throw new Error('no response');
        expect(await readTimeline(response)).toEqual(cached);
      });
      And('no forecast was fetched', () => {
        expect(calls).toHaveLength(0);
      });
    }
  );

  Scenario(
    'A cache miss fetches the forecast and caches the result',
    ({ Given, When, Then, And }) => {
      let cache = memoryCache();
      const calls: string[] = [];
      let response: Response | undefined;

      Given('an empty cache', () => {
        cache = memoryCache();
      });
      When('the widget asks for the verdict', async () => {
        response = await handleVerdict(
          new URL('https://worker.test/verdict'),
          cache,
          NOW,
          fakeOpenMeteo(calls)
        );
      });
      Then('the response has 24 hours', async () => {
        if (response === undefined) throw new Error('no response');
        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
        const timeline = await readTimeline(response);
        expect(timeline.hours).toHaveLength(24);
        expect(timeline.spot.id).toBe('donabate');
        expect(calls).toHaveLength(2);
      });
      And('the timeline is cached for the current hour', () => {
        const raw = cache.store.get(CURRENT_HOUR_KEY);
        if (raw === undefined) throw new Error('nothing cached');
        expect(isVerdictTimeline(JSON.parse(raw))).toBe(true);
      });
    }
  );

  Scenario('An unknown spot is not found', ({ Given, When, Then }) => {
    let cache = memoryCache();
    let response: Response | undefined;

    Given('an empty cache', () => {
      cache = memoryCache();
    });
    When('the widget asks for the verdict at spot "atlantis"', async () => {
      response = await handleVerdict(
        new URL('https://worker.test/verdict?spot=atlantis'),
        cache,
        NOW,
        fakeOpenMeteo([])
      );
    });
    Then('the response status is 404', () => {
      expect(response?.status).toBe(404);
    });
  });

  Scenario('A forecast failure is reported as a bad gateway', ({ Given, When, Then }) => {
    let cache = memoryCache();
    const calls: string[] = [];
    let response: Response | undefined;

    Given('an empty cache and a forecast that fails', () => {
      cache = memoryCache();
    });
    When('the widget asks for the verdict', async () => {
      response = await handleVerdict(
        new URL('https://worker.test/verdict'),
        cache,
        NOW,
        failingFetch(calls)
      );
    });
    Then('the response status is 502', () => {
      expect(response?.status).toBe(502);
      expect(cache.store.size).toBe(0);
    });
  });
});

describe('daylight API v2', () => {
  it.each([
    'verdict:v2:donabate:2026-10-20T09',
    'verdict:v2:previous-engine:donabate:2026-10-20T09',
  ])('does not reuse an earlier engine GO cached at %s', async (oldKey) => {
    const cache = memoryCache();
    const legacy = buildTimeline(forecastHours(), launchSpot(), NOW);
    // The old rules could mark 3s sea GO. Keep a fresh, valid v2 payload so this
    // regression specifically exercises the engine-version cache boundary.
    legacy.hours = legacy.hours.map((entry) => ({ ...entry, wavePeriodS: 3 }));
    expect(legacy.hours[0]?.verdict).toBe('go');
    expect(isVerdictTimeline(legacy)).toBe(true);
    const oldValue = JSON.stringify(legacy);
    cache.store.set(oldKey, oldValue);
    const calls: string[] = [];

    const response = await handleVerdict(
      new URL('https://worker.test/verdict'),
      cache,
      NOW,
      fakeOpenMeteo(calls, 3)
    );
    expect(response.status).toBe(200);
    const timeline = await readTimeline(response);
    expect(timeline.schemaVersion).toBe(2);
    expect(timeline.hours[0]).toMatchObject({ verdict: 'maybe', wavePeriodS: 3 });
    expect(timeline.hours[0]?.board).toBeUndefined();
    expect(calls).toHaveLength(2);
    expect(cache.store.get(CURRENT_HOUR_KEY)).toBe(JSON.stringify(timeline));
    expect(cache.store.get(oldKey)).toBe(oldValue);
    expect(cache.store.size).toBe(2);
  });

  it('marks every partly lit or dark hour dark, without a hidden board', () => {
    const timeline = buildTimeline(forecastHours(), launchSpot(), NOW);
    expect(timeline.schemaVersion).toBe(2);
    for (const entry of timeline.hours) {
      expect(entry.daylight).toBe(isDaylightHour(entry.time, launchSpot()));
      expect(Date.parse(entry.validUntil)).toBe(Date.parse(entry.time) + HOUR_MS);
      if (!entry.daylight) {
        expect(entry.verdict).toBe('dark');
        expect(entry.board).toBeUndefined();
      }
    }
    const { sunrise, sunset } = sunTimes(NOW, launchSpot().latitude, launchSpot().longitude);
    for (const boundary of [sunrise, sunset]) {
      if (boundary === undefined) throw new Error('missing sun boundary');
      const hour = new Date(Math.floor(boundary / HOUR_MS) * HOUR_MS).toISOString();
      const entries = buildTimeline(forecastHours(), launchSpot(), Date.parse(hour)).hours;
      expect(entries[0]).toMatchObject({ daylight: false, verdict: 'dark' });
    }
  });

  it('does not substitute future or expired data for current coverage', async () => {
    expect(buildTimeline(forecastHours(), launchSpot(), MIDNIGHT - 1).hours).toEqual([]);
    expect(
      buildTimeline(forecastHours(), launchSpot(), MIDNIGHT + FORECAST_HOURS * HOUR_MS).hours
    ).toEqual([]);
    const response = await handleVerdict(
      new URL('https://worker.test/verdict'),
      memoryCache(),
      MIDNIGHT + FORECAST_HOURS * HOUR_MS,
      fakeOpenMeteo([])
    );
    expect(response.status).toBe(502);
  });

  it('rejects stale, legacy and inconsistent cached responses', async () => {
    for (const change of [
      { generatedAt: new Date(NOW - HOUR_MS).toISOString() },
      { schemaVersion: 1 },
      { evidenceVersion: undefined },
      { engineVersion: 'old-engine' },
      { profileVersion: 'donabate-v0' },
      ...[undefined, null, 42, 'unknown-code', 'outside-full-daylight-hour'].map((reasonCode) => ({
        hours: [{ ...buildTimeline(forecastHours(), launchSpot(), NOW).hours[0], reasonCode }],
      })),
      {
        hours: buildTimeline(forecastHours(), launchSpot(), NOW).hours.map((hour) => ({
          ...hour,
          reasonCode: undefined,
        })),
      },
      { spot: { id: 'wrong', name: 'Wrong' } },
      {
        hours: [
          {
            ...buildTimeline(forecastHours(), launchSpot(), NOW).hours[0],
            daylight: false,
            verdict: 'go',
          },
        ],
      },
    ]) {
      const cache = memoryCache();
      cache.store.set(
        CURRENT_HOUR_KEY,
        JSON.stringify({ ...buildTimeline(forecastHours(), launchSpot(), NOW), ...change })
      );
      const calls: string[] = [];
      const response = await handleVerdict(
        new URL('https://worker.test/verdict'),
        cache,
        NOW,
        fakeOpenMeteo(calls)
      );
      expect(response.status).toBe(200);
      expect(calls).toHaveLength(2);
    }
  });

  it('serves the same conservative dark entry from cache across sunset', async () => {
    const spot = launchSpot();
    const { sunset } = sunTimes(NOW, spot.latitude, spot.longitude);
    if (sunset === undefined) throw new Error('missing sunset');
    const cache = memoryCache();
    const calls: string[] = [];
    const first = await readTimeline(
      await handleVerdict(
        new URL('https://worker.test/verdict'),
        cache,
        sunset - 1000,
        fakeOpenMeteo(calls)
      )
    );
    const second = await readTimeline(
      await handleVerdict(
        new URL('https://worker.test/verdict'),
        cache,
        sunset + 1000,
        fakeOpenMeteo(calls)
      )
    );
    expect(first.hours[0]).toMatchObject({ verdict: 'dark', daylight: false });
    expect(second).toEqual(first);
    expect(second.hours[0]?.board).toBeUndefined();
    expect(calls).toHaveLength(2);
  });

  it('caps HTTP caching at the next forecast hour', async () => {
    const response = await handleVerdict(
      new URL('https://worker.test/verdict'),
      memoryCache(),
      Date.parse('2026-10-20T09:59:59Z'),
      fakeOpenMeteo([])
    );
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=1');
  });

  it('rejects a board hidden in a dark cached entry', () => {
    const timeline = buildTimeline(forecastHours(), launchSpot(), MIDNIGHT);
    expect(isVerdictTimeline(timeline)).toBe(true);
    expect(
      isVerdictTimeline({ ...timeline, hours: [{ ...timeline.hours[0], board: 'sup' }] })
    ).toBe(false);
  });
  it('drops expired hours and uses the completion clock after a slow live fetch', async () => {
    const spot = launchSpot();
    const { sunset } = sunTimes(NOW, spot.latitude, spot.longitude);
    if (sunset === undefined) throw new Error('missing sunset');
    const boundary = Math.floor(sunset / HOUR_MS) * HOUR_MS;
    let clock = boundary - 1000;
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => clock);
    const upstream = fakeOpenMeteo([]);
    try {
      const response = await handleVerdict(
        new URL('https://worker.test/verdict'),
        memoryCache(),
        undefined,
        async (input, init) => {
          clock = boundary + 1000;
          return upstream(input, init);
        }
      );
      const timeline = await readTimeline(response);
      expect(Date.parse(timeline.hours[0]?.time ?? '')).toBe(boundary);
      expect(timeline.hours[0]?.verdict).toBe('dark');
      expect(timeline.hours[0]?.board).toBeUndefined();
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    } finally {
      spy.mockRestore();
    }
  });

  it('fails closed if a slow cache read outlives freshness or current coverage', async () => {
    for (const delay of [HOUR_MS, 41 * 60_000]) {
      let clock = NOW;
      const cached = buildTimeline(forecastHours(), launchSpot(), NOW);
      if (delay < HOUR_MS) cached.hours = cached.hours.slice(0, 1);
      const spy = vi.spyOn(Date, 'now').mockImplementation(() => clock);
      try {
        const response = await handleVerdict(new URL('https://worker.test/verdict'), {
          get: async () => {
            clock += delay;
            return JSON.stringify(cached);
          },
          put: async () => {},
        });
        expect(response.status).toBe(502);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
      } finally {
        spy.mockRestore();
      }
    }
  });

  it('keeps an explicitly injected clock fixed across async work', async () => {
    const response = await handleVerdict(
      new URL('https://worker.test/verdict'),
      memoryCache(),
      NOW,
      fakeOpenMeteo([])
    );
    expect((await readTimeline(response)).hours[0]?.time).toBe('2026-10-20T09:00:00Z');
  });

  it('rejects nonfinite and negative cached measurements', () => {
    const timeline = buildTimeline(forecastHours(), launchSpot(), NOW);
    for (const field of ['waveHeightM', 'wavePeriodS', 'windSpeedKmh']) {
      for (const value of [-1, NaN, Infinity, -Infinity]) {
        expect(
          isVerdictTimeline({ ...timeline, hours: [{ ...timeline.hours[0], [field]: value }] })
        ).toBe(false);
      }
    }
  });
});

describe('additive surf evidence', () => {
  it('publishes stable engine/profile identity and branch codes', () => {
    const timeline = buildTimeline(forecastHours(), launchSpot(), NOW);
    expect(timeline).toMatchObject({
      schemaVersion: 2,
      evidenceVersion: 1,
      engineVersion: SURF_VERDICT_ENGINE_VERSION,
      profileVersion: 'donabate-v1',
      generatedAt: new Date(NOW).toISOString(),
    });
    expect(isVerdictTimeline(timeline)).toBe(true);
    for (const hour of timeline.hours) expect(typeof hour.reasonCode).toBe('string');
  });
  it('never reads an old v2 key even when its forecast is still fresh', async () => {
    const cache = memoryCache();
    const oldKey = `verdict:v2:${SURF_VERDICT_ENGINE_VERSION}:donabate:2026-10-20T09`;
    cache.store.set(oldKey, JSON.stringify(buildTimeline(forecastHours(), launchSpot(), NOW)));
    const calls: string[] = [];
    await handleVerdict(new URL('https://worker.test/verdict'), cache, NOW, fakeOpenMeteo(calls));
    expect(calls).toHaveLength(2);
    expect(cache.store.has(CURRENT_HOUR_KEY)).toBe(true);
    expect(cache.store.has(oldKey)).toBe(true);
  });
});

it('does not attach registered evidence or reuse KV for a custom profile', async () => {
  const spot = { ...launchSpot(), facing: launchSpot().facing + 1 };
  const cache = { get: vi.fn(async () => null), put: vi.fn(async () => undefined) };
  const calls: string[] = [];
  const timeline = await verdictTimeline(spot, cache, NOW, fakeOpenMeteo(calls));
  expect(timeline.profileVersion).toBeNull();
  expect(calls).toHaveLength(2);
  expect(cache.get).not.toHaveBeenCalled();
  expect(cache.put).not.toHaveBeenCalled();
});
