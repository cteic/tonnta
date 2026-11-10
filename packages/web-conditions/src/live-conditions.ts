import {
  MAX_FORECAST_AGE_MS,
  MAX_WATER_QUALITY_AGE_MS,
  applySwimWaterQuality,
  assessHour,
  assessSwimHour,
  currentHourOf,
  findSwimWindows,
  getWaterQualityStatus,
  headlineFor,
  isForecastFresh,
  isWaterQualityUnknown,
  nextGoodWindow,
  sunTimes,
} from '@tonnta/data';

import type { SpotConditions } from './conditions';

/** Re-evaluate the downloaded forecast locally; this never fetches upstream data. */
export function conditionsAt(conditions: SpotConditions, nowMs: number): SpotConditions {
  const { spot, hours, tides, waterQuality } = conditions;
  const waterQualityStatus = getWaterQualityStatus(
    conditions.waterQualityCheck,
    waterQuality,
    nowMs
  );
  const fresh = isForecastFresh(conditions.loadedAt, nowMs);
  const headline = fresh ? headlineFor(hours, spot, nowMs) : { kind: 'none' as const };
  const current = currentHourOf(hours, nowMs);
  // currentHourOf deliberately falls back to nearest data. A live screen must not
  // present that fallback as a current verdict after the downloaded forecast expires.
  const currentHour =
    fresh &&
    current !== undefined &&
    Date.parse(current.time) <= nowMs &&
    Date.parse(current.time) + 3_600_000 > nowMs
      ? current
      : undefined;
  const updated: SpotConditions = {
    ...conditions,
    headline,
    waterQualityStatus,
    now:
      currentHour === undefined
        ? { verdict: 'flat', reason: 'No current forecast data. Reload to check for updates.' }
        : assessHour(currentHour, spot),
    swimNow: applySwimWaterQuality(
      currentHour === undefined
        ? {
            verdict: 'no',
            reason: 'No current forecast data. Reload to check for updates.',
            nearHighTide: false,
          }
        : assessSwimHour(currentHour, tides),
      waterQuality,
      waterQualityStatus
    ),
    swimWindows:
      !fresh || isWaterQualityUnknown(waterQualityStatus) || waterQualityStatus === 'restricted'
        ? []
        : findSwimWindows(hours, tides, spot, nowMs).slice(0, 3),
  };
  if (!fresh) {
    updated.days = [];
    updated.warnings = [
      ...conditions.warnings,
      'Conditions need to be checked again. Reload before heading out.',
    ];
  }
  delete updated.currentHour;
  delete updated.nextWindow;
  delete updated.swimFirstLight;
  if (currentHour !== undefined) updated.currentHour = currentHour;
  const next = nextGoodWindow(hours, spot, nowMs);
  if (fresh && next !== undefined) updated.nextWindow = next;
  if (headline.kind === 'dark' && headline.firstLight !== undefined) {
    updated.swimFirstLight = applySwimWaterQuality(
      assessSwimHour(headline.firstLight.hour, tides),
      waterQuality,
      waterQualityStatus
    );
  }
  return updated;
}

/** Schedule expiry itself, rather than leaving positive advice until the polling cap. */
export function nextConditionsCheckDelay(
  nowMs: number,
  latitude: number,
  longitude: number,
  loadedAt: number,
  checkedAt: number | undefined
): number {
  const { sunrise, sunset } = sunTimes(nowMs, latitude, longitude);
  const delays = [15_000];
  for (const boundary of [sunrise, sunset]) {
    if (boundary !== undefined && Number.isFinite(boundary) && boundary >= nowMs) {
      delays.push(boundary - nowMs + 1);
    }
  }
  const expirations = [loadedAt + MAX_FORECAST_AGE_MS];
  if (checkedAt !== undefined) expirations.push(checkedAt + MAX_WATER_QUALITY_AGE_MS);
  for (const expiresAt of expirations) {
    if (Number.isFinite(expiresAt) && expiresAt > nowMs) delays.push(expiresAt - nowMs);
  }
  return Math.max(1, Math.min(...delays));
}
