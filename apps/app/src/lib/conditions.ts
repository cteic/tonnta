import {
  DEFAULT_SPOT_ID,
  applyWaterQuality,
  assessHour,
  assessSwimHour,
  currentHourOf,
  fetchHourlyConditions,
  fetchTideEvents,
  fetchWaterQualityAlert,
  findSwimWindows,
  getSpot,
  headlineFor,
  isDaylightHour,
  nextGoodWindow,
  summarizeDays,
} from '@tonnta/data';
import type { GoodWindow, Headline, SwimWindow } from '@tonnta/data';
import type {
  Board,
  DailySummary,
  HourlyConditions,
  Spot,
  SwimVerdictResult,
  TideEvent,
  Verdict,
  VerdictResult,
  WaterQualityAlert,
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
  /** Whether the complete displayed hour falls inside daylight. */
  daylight: boolean;
  board?: Board;
}

/** Hours the conditions chart spans, from the current hour. */
export const CHART_HOURS = 24;

export interface SpotOutlook {
  spot: Spot;
  /** When the sources were last checked by this screen. */
  loadedAt: number;
  /** Retained locally so sunrise/sunset transitions never need a network request. */
  forecastHours: HourlyConditions[];
  /** Verdict for the hour in progress. */
  now: VerdictResult;
  /** What the hero leads with: the verdict in daylight, sunrise and first light after dark. */
  headline: Headline;
  currentHour?: HourlyConditions;
  nextWindow?: GoodWindow;
  /** One entry per day, session hours only — the 7-day strip. */
  days: DailySummary[];
  /** The current hour and the 23 after it, each with its verdict. */
  hours: ChartHour[];
  tides: TideEvent[];
  /** Snámh: the swim verdict for the hour in progress. */
  swimNow: SwimVerdictResult;
  /** After dark, the swim verdict for the first light hour. */
  swimFirstLight?: SwimVerdictResult;
  /** Upcoming swim windows, high-tide windows first. */
  swimWindows: SwimWindow[];
  waterQuality?: WaterQualityAlert;
}

const NO_DATA = 'No forecast data. Check back shortly.';

export function chartHoursAt(hours: HourlyConditions[], spot: Spot, now: number): ChartHour[] {
  const from = currentHourOf(hours, now);
  if (from === undefined || Date.parse(from.time) > now || Date.parse(from.time) + 3_600_000 <= now)
    return [];
  const start = hours.indexOf(from);
  return hours.slice(Math.max(start, 0), Math.max(start, 0) + CHART_HOURS).map((hour) => {
    const result = assessHour(hour, spot);
    const entry: ChartHour = {
      time: hour.time,
      waveHeightM: hour.waveHeightM,
      windSpeedKmh: hour.windSpeedKmh,
      verdict: result.verdict,
      daylight: isDaylightHour(hour.time, spot),
    };
    if (entry.daylight && result.board !== undefined) entry.board = result.board;
    return entry;
  });
}

export async function loadSpotOutlook(spotId: string = DEFAULT_SPOT_ID): Promise<SpotOutlook> {
  const spot = getSpot(spotId);
  if (spot === undefined) {
    throw new Error(`Unknown spot: ${spotId}`);
  }

  // Tides and water quality only feed Snámh; if they fail, the surf verdict still stands.
  const [hours, tides, waterQuality] = await Promise.all([
    fetchHourlyConditions(spot),
    spot.tideStationId !== undefined
      ? fetchTideEvents(spot.tideStationId, 3).catch((): TideEvent[] => [])
      : Promise.resolve<TideEvent[]>([]),
    spot.epaBeachId !== undefined
      ? fetchWaterQualityAlert(spot.epaBeachId).catch(() => undefined)
      : Promise.resolve(undefined),
  ]);
  const nowMs = Date.now();
  const currentHour = currentHourOf(hours, nowMs);
  const headline = headlineFor(hours, spot, nowMs);
  const now: VerdictResult =
    currentHour !== undefined
      ? assessHour(currentHour, spot)
      : { verdict: 'flat', reason: NO_DATA };
  const swimNow = applyWaterQuality(
    currentHour !== undefined
      ? assessSwimHour(currentHour, tides)
      : { verdict: 'no', reason: NO_DATA, nearHighTide: false },
    waterQuality
  );

  const outlook: SpotOutlook = {
    spot,
    loadedAt: nowMs,
    forecastHours: hours,
    now,
    headline,
    days: summarizeDays(hours, spot),
    hours: chartHoursAt(hours, spot, nowMs),
    tides,
    swimNow,
    swimWindows: waterQuality?.restrictionInPlace
      ? []
      : findSwimWindows(hours, tides, spot, nowMs).slice(0, 3),
  };
  if (currentHour !== undefined) {
    outlook.currentHour = currentHour;
  }
  if (waterQuality !== undefined) {
    outlook.waterQuality = waterQuality;
  }
  if (headline.kind === 'dark' && headline.firstLight !== undefined) {
    outlook.swimFirstLight = applyWaterQuality(
      assessSwimHour(headline.firstLight.hour, tides),
      waterQuality
    );
  }
  const window = nextGoodWindow(hours, spot, nowMs);
  if (window !== undefined) {
    outlook.nextWindow = window;
  }
  return outlook;
}
