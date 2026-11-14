import { getSpot, isRecord } from '@tonnta/data';
import type { Board, Verdict, WindState } from '@tonnta/types';

import type { ForecastSnapshot, LocalStorageLike, StorageResult } from './forecast-snapshots';
import { matchForecastSnapshot, parseForecastSnapshot } from './forecast-snapshots';

/**
 * Device-local session diary. Entries live in localStorage — no accounts, no
 * server writes; the value is a personal record of what the sea was doing
 * when a session was good. Everything parsed back out of storage is treated
 * as untrusted input.
 */

export type SessionRating = 'good' | 'grand' | 'poor';

export interface SessionConditions {
  waveHeightM: number;
  wavePeriodS: number;
  windSpeedKmh: number;
  windState: WindState;
  seaTempC?: number;
  verdict: Verdict;
}

export interface SessionEntry {
  id: string;
  timestamp: string; // ISO 8601
  spotId: string;
  conditions: SessionConditions;
  rating: SessionRating;
  board?: Board;
  note?: string;
}

export const DIARY_STORAGE_KEY = 'tonnta.diary.v1';

const RATINGS: readonly SessionRating[] = ['good', 'grand', 'poor'];
const BOARDS: readonly Board[] = ['sup', 'foamie', 'longboard'];
const WIND_STATES: readonly WindState[] = [
  'offshore',
  'cross-off',
  'cross',
  'cross-on',
  'onshore',
  'glassy',
];
const VERDICTS: readonly Verdict[] = ['go', 'maybe', 'flat', 'blown'];

export function isRating(value: unknown): value is SessionRating {
  return typeof value === 'string' && RATINGS.some((rating) => rating === value);
}

export function isBoard(value: unknown): value is Board {
  return typeof value === 'string' && BOARDS.some((board) => board === value);
}

function isWindState(value: unknown): value is WindState {
  return typeof value === 'string' && WIND_STATES.some((state) => state === value);
}

function isVerdict(value: unknown): value is Verdict {
  return typeof value === 'string' && VERDICTS.some((verdict) => verdict === value);
}

function parseConditions(value: unknown): SessionConditions | undefined {
  if (!isRecord(value)) return undefined;
  const { waveHeightM, wavePeriodS, windSpeedKmh, windState, verdict, seaTempC } = value;
  if (
    typeof waveHeightM !== 'number' ||
    typeof wavePeriodS !== 'number' ||
    typeof windSpeedKmh !== 'number' ||
    !isWindState(windState) ||
    !isVerdict(verdict)
  ) {
    return undefined;
  }
  const conditions: SessionConditions = {
    waveHeightM,
    wavePeriodS,
    windSpeedKmh,
    windState,
    verdict,
  };
  if (typeof seaTempC === 'number') {
    conditions.seaTempC = seaTempC;
  }
  return conditions;
}

export function parseEntry(value: unknown): SessionEntry | undefined {
  if (!isRecord(value)) return undefined;
  const { id, timestamp, spotId, conditions, rating, board, note } = value;
  if (
    typeof id !== 'string' ||
    typeof timestamp !== 'string' ||
    typeof spotId !== 'string' ||
    !isRating(rating)
  ) {
    return undefined;
  }
  if (Number.isNaN(new Date(timestamp).getTime())) return undefined;
  const parsedConditions = parseConditions(conditions);
  if (parsedConditions === undefined) return undefined;

  const entry: SessionEntry = {
    id,
    timestamp,
    spotId,
    conditions: parsedConditions,
    rating,
  };
  if (isBoard(board)) {
    entry.board = board;
  }
  if (typeof note === 'string' && note.length > 0) {
    entry.note = note.slice(0, 500);
  }
  return entry;
}

/** Parse a raw localStorage payload into entries, newest first, dropping junk. */
export function parseDiary(raw: string | null): SessionEntry[] {
  if (raw === null || raw.length === 0) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map(parseEntry)
    .filter((entry): entry is SessionEntry => entry !== undefined)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function serializeDiary(entries: SessionEntry[]): string {
  return JSON.stringify(entries);
}

export interface NewSessionInput {
  spotId: string;
  conditions: SessionConditions;
  rating: SessionRating;
  board?: Board | undefined;
  note?: string | undefined;
}

export function createEntry(input: NewSessionInput, now: Date = new Date()): SessionEntry {
  const entry: SessionEntry = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: now.toISOString(),
    spotId: input.spotId,
    conditions: input.conditions,
    rating: input.rating,
  };
  if (input.board !== undefined) {
    entry.board = input.board;
  }
  if (input.note !== undefined && input.note.trim().length > 0) {
    entry.note = input.note.trim().slice(0, 500);
  }
  return entry;
}

export function addEntry(entries: SessionEntry[], entry: SessionEntry): SessionEntry[] {
  return [entry, ...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function removeEntry(entries: SessionEntry[], id: string): SessionEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export interface DiaryInsights {
  goodCount: number;
  /** Median wave height across good sessions (m). */
  medianWaveM: number;
  /** Range of wave heights across good sessions (m). */
  minWaveM: number;
  maxWaveM: number;
  /** Most frequent wind state across good sessions. */
  commonWindState: WindState;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const at = (index: number): number => sorted[index] ?? 0;
  return sorted.length % 2 === 1 ? at(mid) : (at(mid - 1) + at(mid)) / 2;
}

/**
 * What do this person's good days have in common? Needs at least three good
 * sessions before it says anything — one great day is a story, three is a
 * pattern.
 */
export function diaryInsights(entries: SessionEntry[]): DiaryInsights | undefined {
  const good = entries.filter((entry) => entry.rating === 'good');
  if (good.length < 3) return undefined;

  const waves = good.map((entry) => entry.conditions.waveHeightM);
  const stateCounts = new Map<WindState, number>();
  for (const entry of good) {
    const state = entry.conditions.windState;
    stateCounts.set(state, (stateCounts.get(state) ?? 0) + 1);
  }
  let commonWindState: WindState = 'cross';
  let best = -1;
  for (const [state, count] of stateCounts) {
    if (count > best) {
      commonWindState = state;
      best = count;
    }
  }

  return {
    goodCount: good.length,
    medianWaveM: median(waves),
    minWaveM: Math.min(...waves),
    maxWaveM: Math.max(...waves),
    commonWindState,
  };
}

// V2 observations are separate from the legacy session diary. Legacy timestamps
// and model conditions are not promoted into verified visit-time observations.
export const BEACH_REPORT_STORAGE_KEY = 'tonnta.beach-checks.v2';
export type ObservedSurf = 'flat' | 'small' | 'rideable' | 'messy';
export type VisitKind = 'checked' | 'surfed';

const OBSERVED_SURF: readonly ObservedSurf[] = ['flat', 'small', 'rideable', 'messy'];

export function isObservedSurf(value: unknown): value is ObservedSurf {
  return typeof value === 'string' && OBSERVED_SURF.some((state) => state === value);
}

export function isVisitKind(value: unknown): value is VisitKind {
  return value === 'checked' || value === 'surfed';
}
export interface BeachReport {
  schemaVersion: 2;
  id: string;
  spotId: string;
  observedAt: string;
  submittedAt: string;
  visitKind: VisitKind;
  observedSurf: ObservedSurf;
  goodEnough?: boolean;
  rating?: SessionRating;
  board?: Board;
  note?: string;
  /** Embedded immutable evidence, never rematched on reload. */
  forecast?: ForecastSnapshot;
}

export interface BeachReportInput {
  spotId: string;
  observedAt: string;
  visitKind: VisitKind;
  observedSurf: ObservedSurf;
  goodEnough?: boolean | undefined;
  rating?: SessionRating | undefined;
  board?: Board | undefined;
  note?: string | undefined;
}

export function parseBeachReport(value: unknown): BeachReport | undefined {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 2 ||
    typeof value.id !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value.id) ||
    typeof value.spotId !== 'string' ||
    getSpot(value.spotId) === undefined ||
    typeof value.observedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.observedAt)) ||
    typeof value.submittedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.submittedAt)) ||
    Date.parse(value.observedAt) > Date.parse(value.submittedAt) ||
    (value.visitKind !== 'checked' && value.visitKind !== 'surfed') ||
    !isObservedSurf(value.observedSurf) ||
    (value.goodEnough !== undefined && typeof value.goodEnough !== 'boolean') ||
    (value.rating !== undefined && !isRating(value.rating)) ||
    (value.board !== undefined && !isBoard(value.board)) ||
    (value.note !== undefined && (typeof value.note !== 'string' || value.note.length > 500))
  )
    return undefined;
  const report: BeachReport = {
    schemaVersion: 2,
    id: value.id,
    spotId: value.spotId,
    observedAt: value.observedAt,
    submittedAt: value.submittedAt,
    visitKind: value.visitKind,
    observedSurf: value.observedSurf,
  };
  if (typeof value.goodEnough === 'boolean') report.goodEnough = value.goodEnough;
  if (isRating(value.rating)) report.rating = value.rating;
  if (isBoard(value.board)) report.board = value.board;
  if (typeof value.note === 'string') report.note = value.note;
  if (value.forecast !== undefined) {
    const forecast = parseForecastSnapshot(value.forecast);
    // A corrupt/mismatched comparison must not erase the beach observation.
    if (
      forecast !== undefined &&
      matchForecastSnapshot([forecast], report.spotId, report.observedAt) !== undefined
    )
      report.forecast = forecast;
  }
  return report;
}

export function createBeachReport(
  input: BeachReportInput,
  snapshots: ForecastSnapshot[],
  now = new Date()
): BeachReport {
  const report = parseBeachReport({
    ...input,
    observedAt: new Date(input.observedAt).toISOString(),
    note: input.note?.trim().slice(0, 500) || undefined,
    schemaVersion: 2,
    id: crypto.randomUUID(),
    submittedAt: now.toISOString(),
    forecast: matchForecastSnapshot(snapshots, input.spotId, input.observedAt),
  });
  if (report === undefined)
    throw new Error(
      'Choose a valid spot, visit time and sea state. Visit time cannot be in the future.'
    );
  return report;
}

export function readBeachReports(storage: LocalStorageLike): StorageResult<BeachReport[]> {
  try {
    const raw = storage.getItem(BEACH_REPORT_STORAGE_KEY);
    if (raw === null) return { ok: true, value: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed))
      return {
        ok: false,
        error: 'Beach checks could not be read. Existing data has not been changed.',
      };
    const entries = parsed.map(parseBeachReport);
    if (entries.some((entry) => entry === undefined))
      return {
        ok: false,
        error: 'Some beach checks could not be read. Existing data has not been changed.',
      };
    return {
      ok: true,
      value: entries
        .filter((entry): entry is BeachReport => entry !== undefined)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt)),
    };
  } catch {
    return {
      ok: false,
      error: 'Beach checks are unavailable on this device. Nothing has been changed.',
    };
  }
}

export function persistBeachReports(
  storage: LocalStorageLike,
  entries: BeachReport[]
): StorageResult<null> {
  try {
    storage.setItem(BEACH_REPORT_STORAGE_KEY, JSON.stringify(entries));
    return { ok: true, value: null };
  } catch {
    return {
      ok: false,
      error: 'Not saved. Device storage is full or unavailable. Keep this page open and try again.',
    };
  }
}

/** Date/time inputs always mean the selected beach's local time, not the browser's. */
export function visitLocalTime(timestamp: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const part = (name: string) => parts.find((value) => value.type === name)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}

/** Zero candidates for a skipped DST time; two for a repeated hour. Never guess. */
export function visitTimeCandidates(local: string, timezone: string): string[] {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(local)) return [];
  const naive = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(naive)) return [];
  const offsets = new Set<number>();
  for (const hours of [-36, -12, 0, 12, 36]) {
    const probe = naive + hours * 3_600_000;
    offsets.add(
      Date.parse(`${visitLocalTime(new Date(probe).toISOString(), timezone)}:00Z`) - probe
    );
  }
  return [...offsets]
    .map((offset) => new Date(naive - offset).toISOString())
    .filter((candidate) => visitLocalTime(candidate, timezone) === local)
    .sort();
}

/** Only an explicit delete changes legacy data; malformed histories are never overwritten. */
export function removeLegacyEntry(
  storage: LocalStorageLike,
  id: string
): StorageResult<SessionEntry[]> {
  try {
    const raw = storage.getItem(DIARY_STORAGE_KEY);
    if (raw === null) return { ok: true, value: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((entry) => parseEntry(entry) === undefined)) {
      return {
        ok: false,
        error: 'Earlier sessions could not be read safely. Nothing was removed.',
      };
    }
    const entries = parseDiary(raw).filter((entry) => entry.id !== id);
    storage.setItem(DIARY_STORAGE_KEY, serializeDiary(entries));
    return { ok: true, value: entries };
  } catch {
    return {
      ok: false,
      error: 'Could not remove this earlier session. Device storage is unavailable.',
    };
  }
}
