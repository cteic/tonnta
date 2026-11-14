import {
  applyWaterQuality,
  assessHour,
  assessSwimHour,
  currentHourOf,
  findSwimWindows,
  headlineFor,
  isForecastFresh,
  nextGoodWindow,
} from '@tonnta/data';

import type { SpotConditions } from './conditions';

/** Re-evaluate the downloaded forecast locally; this never fetches upstream data. */
export function conditionsAt(conditions: SpotConditions, nowMs: number): SpotConditions {
  const { spot, hours, tides, waterQuality } = conditions;
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
    now:
      currentHour === undefined
        ? { verdict: 'flat', reason: 'No current forecast data. Reload to check for updates.' }
        : assessHour(currentHour, spot),
    swimNow: applyWaterQuality(
      currentHour === undefined
        ? {
            verdict: 'no',
            reason: 'No current forecast data. Reload to check for updates.',
            nearHighTide: false,
          }
        : assessSwimHour(currentHour, tides),
      waterQuality
    ),
    swimWindows:
      !fresh || waterQuality?.restrictionInPlace === true
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
    updated.swimFirstLight = applyWaterQuality(
      assessSwimHour(headline.firstLight.hour, tides),
      waterQuality
    );
  }
  return updated;
}
