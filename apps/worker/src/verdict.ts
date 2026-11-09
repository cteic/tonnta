import {
  DEFAULT_SPOT_ID,
  SURF_VERDICT_ENGINE_VERSION,
  assessHour,
  fetchHourlyConditions,
  getSpot,
  isDaylightHour,
  isForecastFresh,
  isRecord,
} from '@tonnta/data';
import type { Board, HourlyConditions, Spot, Verdict } from '@tonnta/types';

/**
 * Hourly verdict timeline for one spot: the current hour and the ones after
 * it, each judged by the verdict engine in `@tonnta/data`. This is what the
 * home-screen widgets read, so a widget can show the right verdict for every
 * hour of the day from one fetch.
 */

export const TIMELINE_HOURS = 24;

/** KV entries outlive one forecast hour by a little; the key carries the hour. */
const CACHE_TTL_S = 15 * 60;

const HOUR_MS = 60 * 60 * 1000;

export interface VerdictCache {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export interface HourVerdict {
  time: string;
  verdict: Verdict | 'dark';
  daylight: boolean;
  validUntil: string;
  board?: Board;
  reason: string;
  waveHeightM: number;
  wavePeriodS: number;
  windSpeedKmh: number;
}

export interface VerdictTimeline {
  schemaVersion: 2;
  spot: { id: string; name: string; irishName?: string };
  generatedAt: string;
  hours: HourVerdict[];
}

function toHourVerdict(hour: HourlyConditions, spot: Spot): HourVerdict {
  const daylight = isDaylightHour(hour.time, spot);
  const result = daylight
    ? assessHour(hour, spot)
    : { verdict: 'dark' as const, reason: 'Outside a full daylight hour. Stay out of the water.' };
  const entry: HourVerdict = {
    time: hour.time,
    daylight,
    validUntil: new Date(Date.parse(hour.time) + HOUR_MS).toISOString(),
    verdict: result.verdict,
    reason: result.reason,
    waveHeightM: hour.waveHeightM,
    wavePeriodS: hour.wavePeriodS,
    windSpeedKmh: hour.windSpeedKmh,
  };
  if ('board' in result && result.board !== undefined) {
    entry.board = result.board;
  }
  return entry;
}

/** From the hour containing `now`, `count` hours forward. */
export function buildTimeline(
  hours: HourlyConditions[],
  spot: Spot,
  now: number,
  count: number = TIMELINE_HOURS
): VerdictTimeline {
  const current = hours.some(
    (hour) => Date.parse(hour.time) <= now && Date.parse(hour.time) + HOUR_MS > now
  );
  const upcoming = (current ? hours : [])
    .filter((hour) => Date.parse(hour.time) + HOUR_MS > now)
    .slice(0, count)
    .map((hour) => toHourVerdict(hour, spot));
  const summary: VerdictTimeline['spot'] = { id: spot.id, name: spot.name };
  if (spot.irishName !== undefined) {
    summary.irishName = spot.irishName;
  }
  return {
    schemaVersion: 2,
    spot: summary,
    generatedAt: new Date(now).toISOString(),
    hours: upcoming,
  };
}

const VERDICTS: readonly string[] = ['go', 'maybe', 'flat', 'blown', 'dark'];
const BOARDS: readonly string[] = ['sup', 'foamie', 'longboard'];

function isHourVerdict(value: unknown): value is HourVerdict {
  return (
    isRecord(value) &&
    typeof value.time === 'string' &&
    Number.isFinite(Date.parse(value.time)) &&
    typeof value.validUntil === 'string' &&
    Date.parse(value.validUntil) === Date.parse(value.time) + HOUR_MS &&
    typeof value.daylight === 'boolean' &&
    (value.daylight
      ? value.verdict !== 'dark'
      : value.verdict === 'dark' && value.board === undefined) &&
    typeof value.verdict === 'string' &&
    VERDICTS.includes(value.verdict) &&
    (value.board === undefined ||
      (typeof value.board === 'string' && BOARDS.includes(value.board))) &&
    typeof value.reason === 'string' &&
    typeof value.waveHeightM === 'number' &&
    Number.isFinite(value.waveHeightM) &&
    value.waveHeightM >= 0 &&
    typeof value.wavePeriodS === 'number' &&
    Number.isFinite(value.wavePeriodS) &&
    value.wavePeriodS >= 0 &&
    typeof value.windSpeedKmh === 'number' &&
    Number.isFinite(value.windSpeedKmh) &&
    value.windSpeedKmh >= 0
  );
}

export function isVerdictTimeline(value: unknown): value is VerdictTimeline {
  return (
    isRecord(value) &&
    value.schemaVersion === 2 &&
    isRecord(value.spot) &&
    typeof value.spot.id === 'string' &&
    typeof value.spot.name === 'string' &&
    typeof value.generatedAt === 'string' &&
    Number.isFinite(Date.parse(value.generatedAt)) &&
    Array.isArray(value.hours) &&
    value.hours.every(isHourVerdict)
  );
}

function cacheKey(spotId: string, now: number): string {
  // Rules can change within the same forecast hour; old verdicts must not survive them.
  return `verdict:v2:${SURF_VERDICT_ENGINE_VERSION}:${spotId}:${new Date(now).toISOString().slice(0, 13)}`;
}

async function readCached(cache: VerdictCache, key: string): Promise<VerdictTimeline | undefined> {
  try {
    const raw = await cache.get(key);
    if (raw === null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isVerdictTimeline(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function verdictTimeline(
  spot: Spot,
  cache: VerdictCache,
  now: number = Date.now(),
  fetchImpl: typeof fetch = fetch
): Promise<VerdictTimeline> {
  const key = cacheKey(spot.id, now);
  const cached = await readCached(cache, key);
  if (
    cached !== undefined &&
    cached.spot.id === spot.id &&
    isForecastFresh(Date.parse(cached.generatedAt), now) &&
    cached.hours.some(
      (hour) => Date.parse(hour.time) <= now && Date.parse(hour.validUntil) > now
    ) &&
    cached.hours.every((hour) => hour.daylight === isDaylightHour(hour.time, spot))
  )
    return cached;

  const timeline = buildTimeline(await fetchHourlyConditions(spot, fetchImpl), spot, now);
  if (timeline.hours.length === 0) throw new Error('No current forecast coverage');
  try {
    await cache.put(key, JSON.stringify(timeline), { expirationTtl: CACHE_TTL_S });
  } catch {
    // A failed cache write costs one extra upstream fetch next time, nothing more.
  }
  return timeline;
}

function respond(body: unknown, status: number, maxAgeS: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': maxAgeS > 0 ? `public, max-age=${maxAgeS}` : 'no-store',
    },
  });
}

/** `GET /verdict?spot=<id>`: defaults to the launch spot. */
export async function handleVerdict(
  url: URL,
  cache: VerdictCache,
  now?: number,
  fetchImpl: typeof fetch = fetch
): Promise<Response> {
  const spot = getSpot(url.searchParams.get('spot') ?? DEFAULT_SPOT_ID);
  if (spot === undefined) {
    return respond({ error: 'unknown spot' }, 404, 0);
  }
  try {
    const timeline = await verdictTimeline(spot, cache, now ?? Date.now(), fetchImpl);
    const completedAt = now ?? Date.now();
    timeline.hours = timeline.hours.filter((hour) => Date.parse(hour.validUntil) > completedAt);
    if (
      !isForecastFresh(Date.parse(timeline.generatedAt), completedAt) ||
      !timeline.hours.some((hour) => Date.parse(hour.time) <= completedAt)
    )
      throw new Error('No fresh current forecast coverage at response completion');
    const expires = Math.min(
      Math.floor(completedAt / HOUR_MS) * HOUR_MS + HOUR_MS,
      Date.parse(timeline.generatedAt) + HOUR_MS
    );
    return respond(
      timeline,
      200,
      Math.max(0, Math.min(300, Math.floor((expires - completedAt) / 1000)))
    );
  } catch {
    return respond({ error: 'forecast unavailable' }, 502, 0);
  }
}
