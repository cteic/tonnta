import {
  DEFAULT_SPOT_ID,
  fetchTideGaugeReadings,
  getSpot,
  isRecord,
  readingsAfter,
  tideTrend,
} from '@tonnta/data';
import type { TideGaugeReading } from '@tonnta/types';

/**
 * `GET /live?spot=<id>`: a Server-Sent Events stream of the spot's tide gauge.
 *
 * The client gets a `snapshot` of the last hour on connect, then a `reading`
 * each time the gauge reports (every 5 minutes), with a comment heartbeat in
 * between so proxies keep the connection open. The stream ends after
 * `maxBeats` heartbeats; the `retry` field tells the client to reconnect,
 * which keeps any one invocation bounded.
 */

export interface LiveCache {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export interface LiveOptions {
  heartbeatMs: number;
  /** Poll the gauge every this many heartbeats. */
  pollEveryBeats: number;
  maxBeats: number;
  retryMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  fetchImpl: typeof fetch;
}

export const DEFAULT_LIVE_OPTIONS: LiveOptions = {
  heartbeatMs: 20_000,
  pollEveryBeats: 3,
  maxBeats: 45,
  retryMs: 5_000,
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  fetchImpl: (input, init) => fetch(input, init),
};

const HISTORY_MINUTES = 60;

/** Every open stream shares one upstream fetch per gauge per minute. */
const CACHE_TTL_S = 60;

export function formatSse(event: string, data: unknown, id?: string): string {
  const lines = [`event: ${event}`];
  if (id !== undefined) lines.push(`id: ${id}`);
  lines.push(`data: ${JSON.stringify(data)}`);
  return `${lines.join('\n')}\n\n`;
}

function isReading(value: unknown): value is TideGaugeReading {
  return isRecord(value) && typeof value.time === 'string' && typeof value.levelM === 'number';
}

async function cachedReadings(
  stationId: string,
  cache: LiveCache,
  options: LiveOptions
): Promise<TideGaugeReading[]> {
  const minute = new Date(options.now()).toISOString().slice(0, 16);
  const key = `gauge:v1:${stationId}:${minute}`;
  try {
    const raw = await cache.get(key);
    if (raw !== null) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(isReading)) return parsed;
    }
  } catch {
    // Fall through to the gauge.
  }
  const readings = await fetchTideGaugeReadings(stationId, HISTORY_MINUTES, options.fetchImpl);
  try {
    await cache.put(key, JSON.stringify(readings), { expirationTtl: CACHE_TTL_S });
  } catch {
    // An unwritten cache costs one extra upstream fetch.
  }
  return readings;
}

const SSE_HEADERS: HeadersInit = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'Access-Control-Allow-Origin': '*',
};

export function handleLive(
  url: URL,
  cache: LiveCache,
  waitUntil: (promise: Promise<unknown>) => void,
  overrides: Partial<LiveOptions> = {}
): Response {
  const options: LiveOptions = { ...DEFAULT_LIVE_OPTIONS, ...overrides };
  const spot = getSpot(url.searchParams.get('spot') ?? DEFAULT_SPOT_ID);
  if (spot === undefined || spot.tideGaugeId === undefined) {
    return new Response(JSON.stringify({ error: 'no live gauge for this spot' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const stationId = spot.tideGaugeId;

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const send = (chunk: string) => writer.write(encoder.encode(chunk));

  const run = async () => {
    try {
      await send(`retry: ${options.retryMs}\n\n`);
      let readings = await cachedReadings(stationId, cache, options);
      let lastTime = readings.at(-1)?.time;
      await send(
        formatSse(
          'snapshot',
          {
            spot: { id: spot.id, name: spot.name },
            gauge: stationId,
            readings,
            trend: tideTrend(readings) ?? null,
          },
          lastTime
        )
      );
      for (let beat = 1; beat <= options.maxBeats; beat += 1) {
        await options.sleep(options.heartbeatMs);
        await send(': ping\n\n');
        if (beat % options.pollEveryBeats !== 0) continue;
        readings = await cachedReadings(stationId, cache, options);
        for (const reading of readingsAfter(readings, lastTime)) {
          const upTo = readings.filter((entry) => entry.time <= reading.time);
          await send(
            formatSse('reading', { ...reading, trend: tideTrend(upTo) ?? null }, reading.time)
          );
          lastTime = reading.time;
        }
      }
    } catch (error) {
      // A write fails once the client has gone; an upstream failure is reported before closing.
      const message = error instanceof Error ? error.message : 'stream failed';
      await send(formatSse('error', { message })).catch(() => {});
    } finally {
      await writer.close().catch(() => {});
    }
  };
  // The stream outlives the handler's return; waitUntil keeps the runtime from cutting it short.
  waitUntil(run());

  return new Response(readable, { status: 200, headers: SSE_HEADERS });
}
