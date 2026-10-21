import type {
  Board,
  DailySummary,
  HourlyConditions,
  Spot,
  Verdict,
  WindState,
} from '@tonnta/types';

import type { VerdictThresholds } from './verdict';
import { assessHour, spotThresholds } from './verdict';

/**
 * Aggregation over the hourly forecast: the 7-day strip and the "next good
 * window" card both come from here. Only daylight-ish hours count — nobody
 * is paddling out at Donabate at 2am.
 */

const SESSION_START_HOUR = 6;
const SESSION_END_HOUR = 22;

export interface GoodWindow {
  start: string; // ISO time of first good hour (UTC)
  end: string; // ISO time of last good hour (UTC)
  hours: HourlyConditions[];
  board?: Board;
}

interface LocalStamp {
  date: string; // YYYY-MM-DD
  hour: number;
}

/** True when the time falls in local session hours (06:00–22:00) at the spot. */
export function isSessionTime(isoTime: string, timezone: string): boolean {
  const stamp = localStamp(isoTime, timezone);
  return stamp !== undefined && isSessionHour(stamp);
}

function localStamp(isoTime: string, timezone: string): LocalStamp | undefined {
  const parsed = new Date(isoTime);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parsed);
  const get = (type: string): string | undefined => parts.find((p) => p.type === type)?.value;
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  if (year === undefined || month === undefined || day === undefined || hour === undefined) {
    return undefined;
  }
  return { date: `${year}-${month}-${day}`, hour: Number(hour) };
}

function isSessionHour(stamp: LocalStamp): boolean {
  return stamp.hour >= SESSION_START_HOUR && stamp.hour < SESSION_END_HOUR;
}

const VERDICT_RANK: Record<Verdict, number> = { go: 3, maybe: 2, flat: 1, blown: 0 };

function dominantWindState(states: WindState[]): WindState {
  const counts = new Map<WindState, number>();
  for (const state of states) {
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  let best: WindState = 'cross';
  let bestCount = -1;
  for (const [state, count] of counts) {
    if (count > bestCount) {
      best = state;
      bestCount = count;
    }
  }
  return best;
}

/** Contiguous runs of GO hours within session time, best (longest) first. */
export function findGoodWindows(
  hours: HourlyConditions[],
  spot: Spot,
  thresholds?: VerdictThresholds
): GoodWindow[] {
  const windows: GoodWindow[] = [];
  let current: HourlyConditions[] = [];

  const flush = (): void => {
    if (current.length === 0) return;
    const first = current[0];
    const last = current[current.length - 1];
    if (first !== undefined && last !== undefined) {
      const boards = current
        .map((hour) => assessHour(hour, spot, thresholds ?? spotThresholds(spot)).board)
        .filter((board): board is Board => board !== undefined);
      const window: GoodWindow = { start: first.time, end: last.time, hours: [...current] };
      const board = boards[0];
      if (board !== undefined) {
        window.board = board;
      }
      windows.push(window);
    }
    current = [];
  };

  for (const hour of hours) {
    const stamp = localStamp(hour.time, spot.timezone);
    const isGo =
      stamp !== undefined &&
      isSessionHour(stamp) &&
      assessHour(hour, spot, thresholds ?? spotThresholds(spot)).verdict === 'go';
    if (isGo) {
      current.push(hour);
    } else {
      flush();
    }
  }
  flush();

  return windows.sort((a, b) => b.hours.length - a.hours.length || a.start.localeCompare(b.start));
}

/** The next upcoming GO window in chronological order, if any. */
export function nextGoodWindow(
  hours: HourlyConditions[],
  spot: Spot,
  thresholds?: VerdictThresholds
): GoodWindow | undefined {
  return findGoodWindows(hours, spot, thresholds ?? spotThresholds(spot)).sort((a, b) =>
    a.start.localeCompare(b.start)
  )[0];
}

export function summarizeDays(
  hours: HourlyConditions[],
  spot: Spot,
  thresholds?: VerdictThresholds
): DailySummary[] {
  const byDate = new Map<string, HourlyConditions[]>();
  for (const hour of hours) {
    const stamp = localStamp(hour.time, spot.timezone);
    if (stamp === undefined || !isSessionHour(stamp)) {
      continue;
    }
    const bucket = byDate.get(stamp.date) ?? [];
    bucket.push(hour);
    byDate.set(stamp.date, bucket);
  }

  const summaries: DailySummary[] = [];
  for (const [date, dayHours] of byDate) {
    let bestVerdict: Verdict = 'flat';
    let board: Board | undefined;
    let maxWave = 0;
    const windStates: WindState[] = [];

    for (const hour of dayHours) {
      const result = assessHour(hour, spot, thresholds ?? spotThresholds(spot));
      windStates.push(hour.windState);
      maxWave = Math.max(maxWave, hour.waveHeightM);
      if (VERDICT_RANK[result.verdict] > VERDICT_RANK[bestVerdict]) {
        bestVerdict = result.verdict;
        board = result.board;
      }
    }

    const summary: DailySummary = {
      date,
      verdict: bestVerdict,
      maxWaveHeightM: maxWave,
      dominantWindState: dominantWindState(windStates),
    };
    if (board !== undefined) {
      summary.board = board;
    }
    const windows = findGoodWindows(dayHours, spot, thresholds ?? spotThresholds(spot));
    const bestWindow = windows[0];
    if (bestWindow !== undefined) {
      summary.bestWindow = { start: bestWindow.start, end: bestWindow.end };
    }
    summaries.push(summary);
  }

  return summaries.sort((a, b) => a.date.localeCompare(b.date));
}
