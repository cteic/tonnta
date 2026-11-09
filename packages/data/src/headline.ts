import type { HourlyConditions, Spot, VerdictResult } from '@tonnta/types';

import { currentHourOf } from './current-hour';
import { isDaylight, isDaylightHour, sunTimes } from './daylight';
import { assessHour } from './verdict';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What the home screen leads with. In daylight, the verdict for the hour in
 * progress. After dark there is no verdict, because nobody should be in the
 * water: instead the next sunrise and the verdict for the first light hour.
 */
export type Headline =
  | { kind: 'verdict'; hour: HourlyConditions; result: VerdictResult }
  | {
      kind: 'dark';
      /** The next sunrise, ISO, when the sun rises at all. */
      sunrise?: string;
      firstLight?: { hour: HourlyConditions; result: VerdictResult };
    }
  | { kind: 'none' };

function nextSunrise(now: number, spot: Spot): string | undefined {
  for (const at of [now, now + DAY_MS / 2, now + DAY_MS]) {
    const { sunrise } = sunTimes(at, spot.latitude, spot.longitude);
    if (sunrise !== undefined && sunrise > now) return new Date(sunrise).toISOString();
  }
  return undefined;
}

export function headlineFor(hours: HourlyConditions[], spot: Spot, now: number): Headline {
  const hour = currentHourOf(hours, now);
  if (hour === undefined || Date.parse(hour.time) > now || Date.parse(hour.time) + 3_600_000 <= now)
    return { kind: 'none' };
  if (!Number.isFinite(now)) return { kind: 'none' };
  if (isDaylight(now, spot.latitude, spot.longitude)) {
    return { kind: 'verdict', hour, result: assessHour(hour, spot) };
  }
  const dark: Extract<Headline, { kind: 'dark' }> = { kind: 'dark' };
  const sunrise = nextSunrise(now, spot);
  if (sunrise !== undefined) dark.sunrise = sunrise;
  const light = hours.find(
    (candidate) => Date.parse(candidate.time) > now && isDaylightHour(candidate.time, spot)
  );
  if (light !== undefined) dark.firstLight = { hour: light, result: assessHour(light, spot) };
  return dark;
}
