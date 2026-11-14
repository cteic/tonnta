import { assessHour, isDaylightHour, isForecastFresh } from '@tonnta/data';
import type { SpotConditions } from '@tonnta/web-conditions';

/** Save retained, future-facing hourly model data, never manufacture a past forecast. */
export function forecastHoursToCapture(conditions: SpotConditions, capturedAt: number) {
  if (!isForecastFresh(conditions.loadedAt, capturedAt)) return [];
  return conditions.hours
    .filter((hour) => {
      const start = Date.parse(hour.time);
      return (
        Number.isFinite(start) &&
        start + 3_600_000 > capturedAt &&
        start < capturedAt + 7 * 24 * 3_600_000 &&
        isDaylightHour(hour.time, conditions.spot)
      );
    })
    .map((hour) => ({ hour, verdict: assessHour(hour, conditions.spot) }));
}
