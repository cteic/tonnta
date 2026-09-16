import {
  DEFAULT_SPOT_ID,
  assessHour,
  fetchHourlyConditions,
  getSpot,
  nextGoodWindow,
  summarizeDays,
} from '@tonnta/data';
import type { GoodWindow } from '@tonnta/data';
import type { DailySummary, HourlyConditions, Spot, VerdictResult } from '@tonnta/types';

/**
 * Home-screen data assembly. The app fetches Open-Meteo directly from the
 * device; a cached worker proxy takes over when spots and users grow.
 */

export interface SpotOutlook {
  spot: Spot;
  /** Verdict for the current hour (or the next forecast hour if it's night). */
  now: VerdictResult;
  currentHour?: HourlyConditions;
  nextWindow?: GoodWindow;
  /** One entry per day, session hours only — the 7-day strip. */
  days: DailySummary[];
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

  const outlook: SpotOutlook = { spot, now, days: summarizeDays(hours, spot) };
  if (currentHour !== undefined) {
    outlook.currentHour = currentHour;
  }
  const window = nextGoodWindow(hours, spot);
  if (window !== undefined) {
    outlook.nextWindow = window;
  }
  return outlook;
}
