import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { DEFAULT_SPOT_ID, assessHour, getSpot } from '@tonnta/data';
import type { HourlyConditions, Spot } from '@tonnta/types';

import type { VerdictCache, VerdictTimeline } from './verdict';
import { buildTimeline, handleVerdict, isVerdictTimeline } from './verdict';

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
function fakeOpenMeteo(calls: string[]): typeof fetch {
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
          wave_period: pick((i) => 4 + (i % 5)),
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

const CURRENT_HOUR_KEY = 'verdict:v1:donabate:2026-10-20T09';

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
        const expected = assessHour(source, spot);
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
