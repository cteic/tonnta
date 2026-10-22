import { isRecord } from '@tonnta/data';
import type { TideGaugeReading, TideTrend } from '@tonnta/types';

import type { SseMessage } from './sse';

/** What the live tide card shows, folded from the worker's `/live` stream. */
export interface LiveTideState {
  gauge?: string;
  readings: TideGaugeReading[];
  trend: TideTrend | null;
}

export const EMPTY_LIVE_TIDE: LiveTideState = { readings: [], trend: null };

/** The card's sparkline spans the last hour of readings. */
const WINDOW_MS = 60 * 60 * 1000;

const TRENDS: readonly string[] = ['rising', 'falling', 'slack'];

function isReading(value: unknown): value is TideGaugeReading {
  return isRecord(value) && typeof value.time === 'string' && typeof value.levelM === 'number';
}

function parseTrend(value: unknown): TideTrend | null {
  if (value === 'rising' || value === 'falling' || value === 'slack') return value;
  return null;
}

function parseJson(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

function lastHour(readings: TideGaugeReading[]): TideGaugeReading[] {
  const latest = readings.at(-1);
  if (latest === undefined) return readings;
  const cutoff = Date.parse(latest.time) - WINDOW_MS;
  return readings.filter((reading) => Date.parse(reading.time) >= cutoff);
}

/** Apply one stream event. Unknown events and malformed payloads leave the state as it was. */
export function applyLiveMessage(state: LiveTideState, message: SseMessage): LiveTideState {
  const payload = parseJson(message.data);
  if (!isRecord(payload)) return state;

  if (message.event === 'snapshot') {
    if (!Array.isArray(payload.readings) || !payload.readings.every(isReading)) return state;
    const next: LiveTideState = {
      readings: lastHour([...payload.readings].sort((a, b) => a.time.localeCompare(b.time))),
      trend: parseTrend(payload.trend),
    };
    if (typeof payload.gauge === 'string') next.gauge = payload.gauge;
    return next;
  }

  if (message.event === 'reading') {
    if (!isReading(payload)) return state;
    const reading: TideGaugeReading = { time: payload.time, levelM: payload.levelM };
    if (state.readings.some((existing) => existing.time === reading.time)) return state;
    const readings = lastHour(
      [...state.readings, reading].sort((a, b) => a.time.localeCompare(b.time))
    );
    return {
      ...state,
      readings,
      trend: TRENDS.includes(String(payload.trend)) ? parseTrend(payload.trend) : state.trend,
    };
  }

  return state;
}

/** Signed metres, the way a tide table prints them: "+0.44 m", "−0.12 m". */
export function formatLevel(levelM: number): string {
  const sign = levelM < 0 ? '−' : '+';
  return `${sign}${Math.abs(levelM).toFixed(2)} m`;
}
