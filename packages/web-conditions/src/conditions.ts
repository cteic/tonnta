import {
  DEFAULT_SPOT_ID,
  applySwimWaterQuality,
  assessHour,
  assessSwimHour,
  currentHourOf,
  fetchBuoyObservation,
  fetchHourlyConditions,
  fetchTideEvents,
  fetchWaterQualityAlert,
  findSwimWindows,
  getSpot,
  getWaterQualityStatus,
  headlineFor,
  isWaterQualityUnknown,
  nextGoodWindow,
  summarizeDays,
  waterQualityMessage,
} from '@tonnta/data';
import type { GoodWindow, Headline, SwimWindow } from '@tonnta/data';
import type {
  BuoyObservation,
  DailySummary,
  HourlyConditions,
  Spot,
  SwimVerdictResult,
  TideEvent,
  VerdictResult,
  WaterQualityAlert,
  WaterQualityCheck,
  WaterQualityStatus,
} from '@tonnta/types';

/**
 * Server-side data assembly for the home screen. Upstream calls are cached
 * via Next's fetch cache; a worker-side KV proxy takes over at scale
 * (tracked on the issues board).
 */

const FORECAST_REVALIDATE_S = 900; // 15 min — model updates are 6-hourly
const LIVE_REVALIDATE_S = 600; // 10 min — buoy reports hourly

async function loadWaterQuality(
  spot: Spot
): Promise<{ alert?: WaterQualityAlert; check: WaterQualityCheck }> {
  if (spot.epaBeachId === undefined) return { check: { status: 'unmapped' } };
  try {
    // A cached or stale-while-revalidated result must not acquire a new check time.
    const alert = await fetchWaterQualityAlert(spot.epaBeachId, (input, init) =>
      fetch(input, { ...init, cache: 'no-store' })
    );
    const check: WaterQualityCheck = { status: 'checked', checkedAt: Date.now() };
    return alert === undefined ? { check } : { alert, check };
  } catch {
    return { check: { status: 'unavailable', attemptedAt: Date.now() } };
  }
}

function cachedFetch(revalidateS: number): typeof fetch {
  return (input, init) => fetch(input, { ...init, next: { revalidate: revalidateS } });
}

export interface SpotConditions {
  spot: Spot;
  /** When the sources were last checked by this screen. */
  loadedAt: number;
  /** Verdict for the hour in progress. */
  now: VerdictResult;
  /** What the hero leads with: the verdict in daylight, sunrise and first light after dark. */
  headline: Headline;
  /** After dark, the swim verdict for the first light hour. */
  swimFirstLight?: SwimVerdictResult;
  currentHour?: HourlyConditions;
  nextWindow?: GoodWindow;
  days: DailySummary[];
  hours: HourlyConditions[];
  tides: TideEvent[];
  buoy?: BuoyObservation;
  /** Snámh mode: swim verdict for the same current hour. */
  swimNow: SwimVerdictResult;
  /** Upcoming swimmable windows, high-tide windows first. */
  swimWindows: SwimWindow[];
  waterQuality?: WaterQualityAlert;
  /** Retrieval outcome, distinct from a water-quality measurement. */
  waterQualityCheck?: WaterQualityCheck;
  waterQualityStatus?: WaterQualityStatus;
  /** Set when a source failed and the screen is degraded. */
  warnings: string[];
}

export async function loadSpotConditions(
  spotId: string = DEFAULT_SPOT_ID
): Promise<SpotConditions> {
  const spot = getSpot(spotId);
  if (spot === undefined) {
    throw new Error(`Unknown spot: ${spotId}`);
  }

  const warnings: string[] = [];

  const [hoursResult, tidesResult, buoyResult, waterQualityResult] = await Promise.allSettled([
    fetchHourlyConditions(spot, cachedFetch(FORECAST_REVALIDATE_S)),
    spot.tideStationId !== undefined
      ? fetchTideEvents(spot.tideStationId, 3, cachedFetch(FORECAST_REVALIDATE_S))
      : Promise.resolve([]),
    spot.buoyStationId !== undefined
      ? fetchBuoyObservation(spot.buoyStationId, cachedFetch(LIVE_REVALIDATE_S))
      : Promise.resolve(undefined),
    loadWaterQuality(spot),
  ]);

  const hours = hoursResult.status === 'fulfilled' ? hoursResult.value : [];
  if (hoursResult.status === 'rejected') {
    warnings.push('The wave forecast is unavailable right now — showing what we have.');
  }
  const tides = tidesResult.status === 'fulfilled' ? tidesResult.value : [];
  if (tidesResult.status === 'rejected') {
    warnings.push('Tide times are unavailable right now.');
  }
  const buoy = buoyResult.status === 'fulfilled' ? buoyResult.value : undefined;
  if (buoyResult.status === 'rejected') {
    warnings.push("The buoy hasn't reported — forecast only.");
  }

  const waterQuality =
    waterQualityResult.status === 'fulfilled' ? waterQualityResult.value.alert : undefined;
  const nowMs = Date.now();
  const waterQualityCheck: WaterQualityCheck =
    waterQualityResult.status === 'fulfilled'
      ? waterQualityResult.value.check
      : { status: 'unavailable', attemptedAt: nowMs };
  const waterQualityStatus = getWaterQualityStatus(waterQualityCheck, waterQuality, nowMs);
  if (waterQualityStatus === 'unavailable' || waterQualityStatus === 'unmapped') {
    warnings.push(waterQualityMessage(waterQualityStatus));
  }

  const currentHour = currentHourOf(hours, nowMs);
  const headline = headlineFor(hours, spot, nowMs);
  const now: VerdictResult =
    currentHour !== undefined
      ? assessHour(currentHour, spot)
      : { verdict: 'flat', reason: 'No forecast data — check back shortly.' };
  const swimNow: SwimVerdictResult = applySwimWaterQuality(
    currentHour !== undefined
      ? assessSwimHour(currentHour, tides)
      : { verdict: 'no', reason: 'No forecast data — check back shortly.', nearHighTide: false },
    waterQuality,
    waterQualityStatus
  );

  const result: SpotConditions = {
    spot,
    loadedAt: nowMs,
    now,
    headline,
    days: summarizeDays(hours, spot),
    hours,
    tides,
    swimNow,
    waterQualityCheck,
    waterQualityStatus,
    swimWindows:
      isWaterQualityUnknown(waterQualityStatus) || waterQualityStatus === 'restricted'
        ? []
        : findSwimWindows(hours, tides, spot, nowMs).slice(0, 3),
    warnings,
  };
  if (currentHour !== undefined) {
    result.currentHour = currentHour;
  }
  if (headline.kind === 'dark' && headline.firstLight !== undefined) {
    result.swimFirstLight = applySwimWaterQuality(
      assessSwimHour(headline.firstLight.hour, tides),
      waterQuality,
      waterQualityStatus
    );
  }
  const window = nextGoodWindow(hours, spot, nowMs);
  if (window !== undefined) {
    result.nextWindow = window;
  }
  if (buoy !== undefined) {
    result.buoy = buoy;
  }
  if (waterQuality !== undefined) {
    result.waterQuality = waterQuality;
  }
  return result;
}
