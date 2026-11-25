import { getSpot, isRecord, spotThresholds } from '@tonnta/data';
import type {
  Board,
  HourlyConditions,
  Verdict,
  VerdictResult,
  VerdictThresholds,
  WindState,
} from '@tonnta/types';

export const FORECAST_STORAGE_KEY = 'tonnta.forecast-snapshots.v1';
const HOUR_MS = 3_600_000;
const MAX_SNAPSHOTS = 4096;
/** Keep well below common localStorage quotas, reserving space for beach reports. */
export const FORECAST_STORAGE_BUDGET_BYTES = 1024 * 1024;

export interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** A client-held saved hourly assessment, not a verified upstream model run. */
export interface ForecastSnapshot {
  schemaVersion: 1;
  id: string;
  spotId: string;
  targetHour: string;
  checkedAt: string;
  capturedAt: string;
  engineVersion: string;
  source: 'open-meteo';
  configuration: {
    latitude: number;
    longitude: number;
    facing: number;
    timezone: string;
    thresholds: VerdictThresholds;
  };
  hour: HourlyConditions;
  verdict: VerdictResult;
}

export type StorageResult<T> = { ok: true; value: T } | { ok: false; error: string };

const WIND_STATES: readonly WindState[] = [
  'offshore',
  'cross-off',
  'cross',
  'cross-on',
  'onshore',
  'glassy',
];
const VERDICTS: readonly Verdict[] = ['go', 'maybe', 'flat', 'blown'];
const BOARDS: readonly Board[] = ['sup', 'foamie', 'longboard'];

function isWindState(value: unknown): value is WindState {
  return typeof value === 'string' && WIND_STATES.some((state) => state === value);
}

function isVerdict(value: unknown): value is Verdict {
  return typeof value === 'string' && VERDICTS.some((verdict) => verdict === value);
}

function isBoard(value: unknown): value is Board {
  return typeof value === 'string' && BOARDS.some((board) => board === value);
}

function instant(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d\d-\d\dT.*Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function finite(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
  );
}

/** Validate every stored field; local storage is untrusted and is never proof of issuance. */
export function parseForecastSnapshot(value: unknown): ForecastSnapshot | undefined {
  if (!isRecord(value) || !isRecord(value.hour) || !isRecord(value.verdict)) return undefined;
  const h = value.hour;
  const v = value.verdict;
  if (!isRecord(value.configuration) || !isRecord(value.configuration.thresholds)) return undefined;
  const c = value.configuration;
  const t = value.configuration.thresholds;
  if (
    value.schemaVersion !== 1 ||
    typeof value.id !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.id) ||
    typeof value.spotId !== 'string' ||
    getSpot(value.spotId) === undefined ||
    !instant(value.targetHour) ||
    !instant(value.checkedAt) ||
    !instant(value.capturedAt) ||
    Date.parse(value.checkedAt) > Date.parse(value.capturedAt) ||
    typeof value.engineVersion !== 'string' ||
    value.engineVersion.length === 0 ||
    value.engineVersion.length > 100 ||
    value.source !== 'open-meteo' ||
    !finite(c.latitude, -90, 90) ||
    !finite(c.longitude, -180, 180) ||
    !finite(c.facing, 0, 360) ||
    typeof c.timezone !== 'string' ||
    c.timezone.length > 100 ||
    !finite(t.flatBelowM, 0, 50) ||
    !finite(t.goFromM, 0, 50) ||
    !finite(t.maxWindKmh, 0, 500) ||
    !finite(t.maxWindOffshoreKmh, 0, 500) ||
    !finite(t.blownOnshoreKmh, 0, 500) ||
    (t.minGoPeriodS !== undefined && !finite(t.minGoPeriodS, 0, 60)) ||
    h.time !== value.targetHour ||
    Date.parse(value.targetHour) % HOUR_MS !== 0 ||
    !finite(h.waveHeightM, 0, 50) ||
    !finite(h.wavePeriodS, 0, 60) ||
    !finite(h.waveDirectionDeg, 0, 360) ||
    !finite(h.windSpeedKmh, 0, 500) ||
    !finite(h.windGustKmh, 0, 500) ||
    !finite(h.windDirectionDeg, 0, 360) ||
    !isWindState(h.windState) ||
    (h.seaTempC !== undefined && !finite(h.seaTempC, -10, 60)) ||
    (h.weatherCode !== undefined && !finite(h.weatherCode, 0, 99)) ||
    !isVerdict(v.verdict) ||
    typeof v.reason !== 'string' ||
    v.reason.length > 2000 ||
    (v.board !== undefined && !isBoard(v.board))
  )
    return undefined;
  const thresholds: VerdictThresholds = {
    flatBelowM: t.flatBelowM,
    goFromM: t.goFromM,
    maxWindKmh: t.maxWindKmh,
    maxWindOffshoreKmh: t.maxWindOffshoreKmh,
    blownOnshoreKmh: t.blownOnshoreKmh,
  };
  if (typeof t.minGoPeriodS === 'number') thresholds.minGoPeriodS = t.minGoPeriodS;
  const hour: HourlyConditions = {
    time: value.targetHour,
    waveHeightM: h.waveHeightM,
    wavePeriodS: h.wavePeriodS,
    waveDirectionDeg: h.waveDirectionDeg,
    windSpeedKmh: h.windSpeedKmh,
    windGustKmh: h.windGustKmh,
    windDirectionDeg: h.windDirectionDeg,
    windState: h.windState,
  };
  if (typeof h.seaTempC === 'number') hour.seaTempC = h.seaTempC;
  if (typeof h.weatherCode === 'number') hour.weatherCode = h.weatherCode;
  const verdict: VerdictResult = { verdict: v.verdict, reason: v.reason };
  if (isBoard(v.board)) verdict.board = v.board;
  return {
    schemaVersion: 1,
    id: value.id,
    spotId: value.spotId,
    targetHour: value.targetHour,
    checkedAt: value.checkedAt,
    capturedAt: value.capturedAt,
    engineVersion: value.engineVersion,
    source: 'open-meteo',
    configuration: {
      latitude: c.latitude,
      longitude: c.longitude,
      facing: c.facing,
      timezone: c.timezone,
      thresholds,
    },
    hour,
    verdict,
  };
}

export interface CaptureForecastInput {
  spotId: string;
  /** When the app checked its sources. This is NOT upstream issuance time. */
  checkedAt: number;
  capturedAt?: number;
  engineVersion: string;
  thresholds?: VerdictThresholds;
  hours: { hour: HourlyConditions; verdict: VerdictResult }[];
}

export async function captureForecastSnapshots(
  input: CaptureForecastInput
): Promise<ForecastSnapshot[]> {
  const spot = getSpot(input.spotId);
  if (spot === undefined) throw new Error('Unknown forecast spot');
  const resolved = input.thresholds ?? spotThresholds(spot);
  const thresholds: VerdictThresholds = {
    flatBelowM: resolved.flatBelowM,
    goFromM: resolved.goFromM,
    maxWindKmh: resolved.maxWindKmh,
    maxWindOffshoreKmh: resolved.maxWindOffshoreKmh,
    blownOnshoreKmh: resolved.blownOnshoreKmh,
  };
  if (resolved.minGoPeriodS !== undefined) thresholds.minGoPeriodS = resolved.minGoPeriodS;
  const configuration = {
    latitude: spot.latitude,
    longitude: spot.longitude,
    facing: spot.facing,
    timezone: spot.timezone,
    thresholds,
  };
  const checkedAt = new Date(input.checkedAt).toISOString();
  const capturedAt = new Date(input.capturedAt ?? Date.now()).toISOString();
  return Promise.all(
    input.hours.map(async ({ hour, verdict }) => {
      // Explicit ordering makes IDs stable across object construction and repeated renders.
      const canonicalHour: HourlyConditions = {
        time: new Date(hour.time).toISOString(),
        waveHeightM: hour.waveHeightM,
        wavePeriodS: hour.wavePeriodS,
        waveDirectionDeg: hour.waveDirectionDeg,
        windSpeedKmh: hour.windSpeedKmh,
        windGustKmh: hour.windGustKmh,
        windDirectionDeg: hour.windDirectionDeg,
        windState: hour.windState,
      };
      if (hour.seaTempC !== undefined) canonicalHour.seaTempC = hour.seaTempC;
      if (hour.weatherCode !== undefined) canonicalHour.weatherCode = hour.weatherCode;
      const canonicalVerdict: VerdictResult = { verdict: verdict.verdict, reason: verdict.reason };
      if (verdict.board !== undefined) canonicalVerdict.board = verdict.board;
      const payload = {
        schemaVersion: 1 as const,
        spotId: input.spotId,
        targetHour: canonicalHour.time,
        checkedAt,
        engineVersion: input.engineVersion,
        source: 'open-meteo' as const,
        configuration,
        hour: canonicalHour,
        verdict: canonicalVerdict,
      };
      const hash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(JSON.stringify(payload))
      );
      const id = [...new Uint8Array(hash)]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      const snapshot = parseForecastSnapshot({ ...payload, id, capturedAt });
      if (snapshot === undefined) throw new Error('Invalid forecast snapshot');
      return snapshot;
    })
  );
}

export function readForecastSnapshots(
  storage: LocalStorageLike
): StorageResult<ForecastSnapshot[]> {
  try {
    const raw = storage.getItem(FORECAST_STORAGE_KEY);
    if (raw === null) return { ok: true, value: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed))
      return { ok: false, error: 'Saved forecast history could not be read.' };
    const snapshots = parsed.map(parseForecastSnapshot);
    if (snapshots.some((snapshot) => snapshot === undefined))
      return {
        ok: false,
        error: 'Saved forecast history is damaged. Existing data has not been changed.',
      };
    return {
      ok: true,
      value: snapshots.filter((snapshot): snapshot is ForecastSnapshot => snapshot !== undefined),
    };
  } catch {
    return { ok: false, error: 'Saved forecast history is unavailable on this device.' };
  }
}

export function persistForecastSnapshots(
  storage: LocalStorageLike,
  snapshots: ForecastSnapshot[]
): StorageResult<null> {
  const previous = readForecastSnapshots(storage);
  if (!previous.ok) return previous;
  const byId = new Map(previous.value.map((snapshot) => [snapshot.id, snapshot]));
  for (const value of snapshots) {
    const snapshot = parseForecastSnapshot(value);
    if (snapshot === undefined) return { ok: false, error: 'Invalid forecast snapshot.' };
    // First saved evidence is immutable. A later render must not replace it.
    if (!byId.has(snapshot.id)) byId.set(snapshot.id, snapshot);
  }
  const retained = [...byId.values()]
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
    .slice(0, MAX_SNAPSHOTS);
  const encoded = retained.map((snapshot) => JSON.stringify(snapshot));
  // localStorage commonly counts UTF-16 code units; use a conservative byte estimate.
  let characters = 2 + encoded.reduce((total, item) => total + item.length + 1, 0);
  while (characters * 2 > FORECAST_STORAGE_BUDGET_BYTES && encoded.length > 0) {
    const removed = encoded.pop();
    characters -= (removed?.length ?? 0) + 1;
  }
  for (;;) {
    try {
      storage.setItem(FORECAST_STORAGE_KEY, `[${encoded.join(',')}]`);
      return { ok: true, value: null };
    } catch (error) {
      const quota =
        isRecord(error) &&
        (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      // Retry only a known quota failure. A denied/unavailable store must not be retried.
      if (!quota || encoded.length <= 1) {
        return { ok: false, error: 'Forecast history could not be saved on this device.' };
      }
      // Bounded geometric eviction preserves newer evidence and never touches reports.
      encoded.splice(Math.max(1, Math.floor(encoded.length / 2)));
    }
  }
}

export function matchForecastSnapshot(
  snapshots: ForecastSnapshot[],
  spotId: string,
  observedAt: string
): ForecastSnapshot | undefined {
  const visit = Date.parse(observedAt);
  if (!Number.isFinite(visit)) return undefined;
  return snapshots
    .filter(
      (snapshot) =>
        snapshot.spotId === spotId &&
        Date.parse(snapshot.targetHour) <= visit &&
        Date.parse(snapshot.targetHour) + HOUR_MS > visit &&
        Date.parse(snapshot.capturedAt) <= visit &&
        Date.parse(snapshot.checkedAt) <= visit
    )
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt) || a.id.localeCompare(b.id))[0];
}
