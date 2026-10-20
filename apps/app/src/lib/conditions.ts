import {
  DEFAULT_SPOT_ID,
  assessHour,
  fetchHourlyConditions,
  getSpot,
  nextGoodWindow,
  summarizeDays,
} from '@tonnta/data';
import type { GoodWindow } from '@tonnta/data';
import type {
  Board,
  DailySummary,
  HourlyConditions,
  Spot,
  Verdict,
  VerdictResult,
} from '@tonnta/types';

/**
 * Home-screen data assembly. The app fetches Open-Meteo directly from the
 * device; a cached worker proxy takes over when spots and users grow.
 */

/** One hour of the 24-hour chart. */
export interface ChartHour {
  time: string;
  waveHeightM: number;
  windSpeedKmh: number;
  verdict: Verdict;
  board?: Board;
}

/** Hours the conditions chart spans, from the current hour. */
export const CHART_HOURS = 24;

export interface SpotOutlook {
  spot: Spot;
  /** Verdict for the current hour (or the next forecast hour if it's night). */
  now: VerdictResult;
  currentHour?: HourlyConditions;
  nextWindow?: GoodWindow;
  /** One entry per day, session hours only — the 7-day strip. */
  days: DailySummary[];
  /** The current hour and the 23 after it, each with its verdict. */
  hours: ChartHour[];
}

function chartHours(
  hours: HourlyConditions[],
  from: HourlyConditions | undefined,
  spot: Spot
): ChartHour[] {
  const start = from === undefined ? 0 : hours.indexOf(from);
  return hours.slice(Math.max(start, 0), Math.max(start, 0) + CHART_HOURS).map((hour) => {
    const result = assessHour(hour, spot);
    const entry: ChartHour = {
      time: hour.time,
      waveHeightM: hour.waveHeightM,
      windSpeedKmh: hour.windSpeedKmh,
      verdict: result.verdict,
    };
    if (result.board !== undefined) entry.board = result.board;
    return entry;
  });
}

function currentOrNextHour(hours: HourlyConditions[]): HourlyConditions | undefined {
  const nowIso = new Date().toISOString();
  return hours.find((hour) => hour.time >= nowIso) ?? hours.at(-1);
}

export async function loadSpotOutlook(spotId: string = DEFAULT_SPOT_ID): Promise<SpotOutlook> {
  const spot = getSpot(spotId);
  if (spot === undefined) {
    throw new Error(`Unknown spot: ${spotId}`);
  }

  const hours = await fetchHourlyConditions(spot);
  const currentHour = currentOrNextHour(hours);
  const now: VerdictResult =
    currentHour !== undefined
      ? assessHour(currentHour, spot)
      : { verdict: 'flat', reason: 'No forecast data — check back shortly.' };

  const outlook: SpotOutlook = {
    spot,
    now,
    days: summarizeDays(hours, spot),
    hours: chartHours(hours, currentHour, spot),
  };
  if (currentHour !== undefined) {
    outlook.currentHour = currentHour;
  }
  const window = nextGoodWindow(hours, spot);
  if (window !== undefined) {
    outlook.nextWindow = window;
  }
  return outlook;
}
