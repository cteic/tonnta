import { isRecord } from '@tonnta/data';
import type { Board, Verdict, WindState } from '@tonnta/types';

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

function isRating(value: unknown): value is SessionRating {
  return typeof value === 'string' && RATINGS.some((rating) => rating === value);
}

function isBoard(value: unknown): value is Board {
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
