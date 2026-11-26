import {
  THUNDERSTORM_REASON,
  assessHour,
  isDaylight,
  isDaylightHour,
  isForecastFresh,
  sunTimes,
} from '@tonnta/data';
import type { HourlyConditions, Spot, Verdict } from '@tonnta/types';

import { CHART_HOURS } from './conditions';
import { WIND_STATE_LABEL, formatHour } from './format';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export interface SurfChartHour {
  time: string;
  daylight: boolean;
  waveHeightM?: number;
  windSpeedKmh?: number;
}

interface SurfDay {
  date: string;
  maxWaveHeightM?: number;
}

type SurfForecast =
  | { status: 'stale' }
  | {
      status: 'fresh';
      current: HourlyConditions | undefined;
      dark: boolean;
      sunrise: string | undefined;
      firstLight: HourlyConditions | undefined;
      hours: SurfChartHour[];
      days: SurfDay[];
    };

export function surfConditionsLine(hour: HourlyConditions): string {
  const wind = WIND_STATE_LABEL[hour.windState];
  return `Waves ${hour.waveHeightM.toFixed(1)} m · Period ${Math.round(hour.wavePeriodS)} s · Wind ${Math.round(hour.windSpeedKmh)} km/h ${wind}`;
}

/** The current hour as separate facts, for the headline card. */
export function surfHeadlineFacts(hour: HourlyConditions): { label: string; value: string }[] {
  return [
    { label: 'Waves', value: `${hour.waveHeightM.toFixed(1)} m` },
    { label: 'Period', value: `${Math.round(hour.wavePeriodS)} s` },
    {
      label: 'Wind',
      value: `${Math.round(hour.windSpeedKmh)} km/h ${WIND_STATE_LABEL[hour.windState]}`,
    },
  ];
}

/** Shown beside every surf rating: the rating describes surf quality, not safety. */
export const SURF_RATING_GUIDANCE =
  'A guide to surf quality, not a safety check. Check conditions and lifeguard flags yourself.';

/** Quality words only: the rating describes the surf, never whether it is safe to go in. */
const SURF_QUALITY: Record<Verdict, string> = {
  go: 'Good surf',
  maybe: 'Marginal surf',
  flat: 'Flat',
  blown: 'Blown out',
};

/** Engine phrases that advise going or staying; the native rating keeps only the description. */
const ADVICE_TAILS = [
  ' — worth going down.',
  ' — save it for another day.',
  "; take the foamie if you're passing anyway.",
  ' — nothing to ride today.',
  ', but a lovely SUP.',
];

function describeOnly(reason: string): string {
  for (const tail of ADVICE_TAILS) {
    if (reason.endsWith(tail)) return `${reason.slice(0, -tail.length)}.`;
  }
  return reason;
}

export interface SurfRating {
  verdict: Verdict;
  /** "Good surf", "Marginal surf", "Flat", "Blown out" or "Thunderstorms". */
  quality: string;
  /** "Good surf: 0.6 m at 5 s, 12 km/h offshore" */
  headline: string;
  reason: string;
}

/** The surf-quality rating for one forecast hour, with the facts and reason behind it. */
export function surfRating(hour: HourlyConditions, spot: Spot): SurfRating {
  const result = assessHour(hour, spot);
  const quality =
    result.reason === THUNDERSTORM_REASON ? 'Thunderstorms' : SURF_QUALITY[result.verdict];
  const facts = `${hour.waveHeightM.toFixed(1)} m at ${Math.round(hour.wavePeriodS)} s, ${Math.round(hour.windSpeedKmh)} km/h ${WIND_STATE_LABEL[hour.windState]}`;
  return {
    verdict: result.verdict,
    quality,
    headline: `${quality}: ${facts}`,
    reason: describeOnly(result.reason),
  };
}

export function surfChartHourLabel(hour: SurfChartHour, timezone: string): string {
  const forecast =
    hour.waveHeightM === undefined || hour.windSpeedKmh === undefined
      ? 'Forecast unavailable'
      : `Waves ${hour.waveHeightM.toFixed(1)} metres, wind ${Math.round(hour.windSpeedKmh)} kilometres per hour`;
  const daylight = hour.daylight ? 'Daylight' : 'Outside full daylight hours';
  return `${formatHour(hour.time, timezone)}. ${forecast}. ${daylight}.`;
}

function nextSunrise(spot: Spot, now: number): number | undefined {
  for (const at of [now, now + DAY_MS / 2, now + DAY_MS]) {
    const { sunrise } = sunTimes(at, spot.latitude, spot.longitude);
    if (sunrise !== undefined && sunrise > now) return sunrise;
  }
  return undefined;
}

function dailyWaves(forecast: HourlyConditions[], spot: Spot, currentStart: number): SurfDay[] {
  const localDate = new Intl.DateTimeFormat('sv-SE', {
    timeZone: spot.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const firstDate = Date.parse(localDate.format(currentStart));
  const peaks = new Map<string, number>();
  for (const hour of forecast) {
    const at = Date.parse(hour.time);
    if (at < currentStart || !Number.isFinite(at)) continue;
    const date = localDate.format(at);
    peaks.set(date, Math.max(peaks.get(date) ?? 0, hour.waveHeightM));
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstDate + index * DAY_MS).toISOString().slice(0, 10);
    const maxWaveHeightM = peaks.get(date);
    return maxWaveHeightM === undefined ? { date } : { date, maxWaveHeightM };
  });
}

export function surfForecastAt(
  forecast: HourlyConditions[],
  spot: Spot,
  loadedAt: number,
  now: number
): SurfForecast {
  if (!isForecastFresh(loadedAt, now)) return { status: 'stale' };

  const currentStart = Math.floor(now / HOUR_MS) * HOUR_MS;
  const byTime = new Map(forecast.map((hour) => [Date.parse(hour.time), hour]));
  const dark = !isDaylight(now, spot.latitude, spot.longitude);
  const nextLight = dark ? nextSunrise(spot, now) : undefined;
  const firstLightStart =
    nextLight === undefined ? undefined : Math.ceil(nextLight / HOUR_MS) * HOUR_MS;
  const firstLight = firstLightStart === undefined ? undefined : byTime.get(firstLightStart);
  const hours = Array.from({ length: CHART_HOURS }, (_, index): SurfChartHour => {
    const at = currentStart + index * HOUR_MS;
    const time = new Date(at).toISOString();
    const slot = { time, daylight: isDaylightHour(time, spot) };
    const hour = byTime.get(at);
    if (hour === undefined) return slot;
    return { ...slot, waveHeightM: hour.waveHeightM, windSpeedKmh: hour.windSpeedKmh };
  });

  return {
    status: 'fresh',
    current: byTime.get(currentStart),
    dark,
    sunrise: nextLight === undefined ? undefined : new Date(nextLight).toISOString(),
    firstLight:
      firstLight !== undefined && isDaylightHour(firstLight.time, spot) ? firstLight : undefined,
    hours,
    days: dailyWaves(forecast, spot, currentStart),
  };
}
