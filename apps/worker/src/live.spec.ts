import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { LiveCache, LiveOptions } from './live';
import { handleLive } from './live';

const feature = await loadFeature('./live.feature');

const START = Date.parse('2026-10-20T15:15:00Z');
const STEP_MS = 5 * 60 * 1000;

function gaugeRows(count: number): [string, string, number][] {
  return Array.from({ length: count }, (_, index) => [
    new Date(START + index * STEP_MS).toISOString().replace('.000Z', 'Z'),
    'Skerries Harbour',
    Number((0.2 + index * 0.02).toFixed(3)),
  ]);
}

/** A gauge that has `counts[n]` readings on its nth poll (the last count repeats). */
function fakeGauge(counts: number[]): typeof fetch {
  let call = 0;
  return async () => {
    const count = counts[Math.min(call, counts.length - 1)] ?? 0;
    call += 1;
    const body = {
      table: {
        columnNames: ['time', 'station_id', 'Water_Level_OD_Malin'],
        rows: gaugeRows(count),
      },
    };
    return new Response(JSON.stringify(body), { status: 200 });
  };
}

function memoryCache(): LiveCache {
  const store = new Map<string, string>();
  return {
    async get(key) {
      return store.get(key) ?? null;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

/** Each call moves the clock a minute on, so every poll misses the per-minute cache. */
function steppingClock(): () => number {
  let now = Date.parse('2026-10-20T16:20:00Z');
  return () => {
    now += 60_000;
    return now;
  };
}

interface SseEvent {
  event: string;
  data: unknown;
}

function parseEvents(text: string): SseEvent[] {
  return text
    .split('\n\n')
    .map((block) => block.split('\n'))
    .filter((lines) => lines.some((line) => line.startsWith('event: ')))
    .map((lines) => ({
      event: (lines.find((line) => line.startsWith('event: ')) ?? '').slice(7),
      data: JSON.parse((lines.find((line) => line.startsWith('data: ')) ?? 'data: null').slice(6)),
    }));
}

async function openStream(spot: string, overrides: Partial<LiveOptions>): Promise<Response> {
  const pending: Promise<unknown>[] = [];
  const response = handleLive(
    new URL(`https://worker.test/live?spot=${spot}`),
    memoryCache(),
    (promise) => pending.push(promise),
    {
      heartbeatMs: 0,
      pollEveryBeats: 3,
      maxBeats: 6,
      sleep: async () => {},
      now: steppingClock(),
      ...overrides,
    }
  );
  return response;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('A new client gets the last hour as a snapshot', ({ Given, When, Then, And }) => {
    let fetchImpl: typeof fetch = fetch;
    let text = '';
    Given('a gauge with an hour of readings', () => {
      fetchImpl = fakeGauge([12]);
    });
    When('a client opens the live stream', async () => {
      const response = await openStream('donabate', { fetchImpl });
      expect(response.headers.get('Content-Type')).toContain('text/event-stream');
      text = await response.text();
    });
    Then('the stream tells the client to retry after 5 seconds', () => {
      expect(text.startsWith('retry: 5000\n\n')).toBe(true);
    });
    And('the first event is a snapshot of every reading with its trend', () => {
      const [first] = parseEvents(text);
      expect(first?.event).toBe('snapshot');
      expect(first?.data).toMatchObject({ gauge: 'Skerries Harbour', trend: 'rising' });
      const data = first?.data;
      const readings =
        typeof data === 'object' && data !== null && 'readings' in data ? data.readings : [];
      expect(Array.isArray(readings) ? readings.length : 0).toBe(12);
    });
  });

  Scenario(
    'New gauge readings are sent as they arrive, once each',
    ({ Given, When, Then, And }) => {
      let fetchImpl: typeof fetch = fetch;
      let text = '';
      Given('a gauge with an hour of readings that reports again during the stream', () => {
        // Snapshot sees 12, the first poll 13, the second poll 14.
        fetchImpl = fakeGauge([12, 13, 14]);
      });
      When('a client opens the live stream', async () => {
        text = await (await openStream('donabate', { fetchImpl })).text();
      });
      Then('the stream sends one reading event per new reading', () => {
        const readings = parseEvents(text).filter((event) => event.event === 'reading');
        expect(readings.map((event) => event.data)).toEqual([
          { time: '2026-10-20T16:15:00Z', levelM: 0.44, trend: 'rising' },
          { time: '2026-10-20T16:20:00Z', levelM: 0.46, trend: 'rising' },
        ]);
      });
      And('heartbeats keep the connection open between them', () => {
        expect(text.match(/: ping\n\n/g)).toHaveLength(6);
      });
    }
  );

  Scenario('A spot without a gauge has no stream', ({ When, Then }) => {
    let response: Response | undefined;
    When('a client opens the live stream for spot "el-cotillo"', async () => {
      response = await openStream('el-cotillo', { fetchImpl: fakeGauge([12]) });
    });
    Then('the response status is 404', () => {
      expect(response?.status).toBe(404);
    });
  });

  Scenario('A gauge outage is reported before the stream closes', ({ Given, When, Then }) => {
    let fetchImpl: typeof fetch = fetch;
    let text = '';
    Given('a gauge that is unreachable', () => {
      fetchImpl = async () => new Response('down', { status: 503 });
    });
    When('a client opens the live stream', async () => {
      text = await (await openStream('donabate', { fetchImpl })).text();
    });
    Then('the stream ends with an error event', () => {
      const events = parseEvents(text);
      expect(events.at(-1)).toEqual({
        event: 'error',
        data: { message: 'ERDDAP tide gauge: HTTP 503' },
      });
    });
  });
});
