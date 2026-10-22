import type {
  HourlyConditions,
  Spot,
  SwimVerdictResult,
  TideEvent,
  WaterQualityAlert,
} from '@tonnta/types';

import { isDaylightHour } from './daylight';
import { THUNDERSTORM_REASON, isThunderstorm } from './weather';

/**
 * The Snámh engine — the surf verdict inverted. Flat, calm water is a bad
 * surf day and a perfect swim day; the same hourly data drives both.
 * Donabate is shallow, so the swimmable window hugs high tide.
 */

export interface SwimThresholds {
  /** Wind below this with small waves is a GREAT swim (km/h). */
  greatWindKmh: number;
  /** Waves at or under this qualify for GREAT (m). */
  greatWaveM: number;
  /** Upper wind bound for an OK swim (km/h). */
  okWindKmh: number;
  /** Upper wave bound for an OK swim (m). */
  okWaveM: number;
}

export const DEFAULT_SWIM_THRESHOLDS: SwimThresholds = {
  greatWindKmh: 15,
  greatWaveM: 0.4,
  okWindKmh: 25,
  okWaveM: 0.6,
};

const HIGH_TIDE_WINDOW_MS = 2 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface SwimWindow {
  start: string; // ISO time of first swimmable hour (UTC)
  end: string; // ISO time of last swimmable hour (UTC)
  hours: HourlyConditions[];
  /** Every hour of the window falls within ±2h of the same high tide. */
  nearHighTide: boolean;
  /** That high tide, ISO, when `nearHighTide`. */
  highTide?: string;
}

/** The high tide within ±2h of `isoTime`, closest first. */
export function highTideNear(isoTime: string, tides: TideEvent[]): TideEvent | undefined {
  const time = Date.parse(isoTime);
  if (Number.isNaN(time)) {
    return undefined;
  }
  let best: TideEvent | undefined;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const tide of tides) {
    if (tide.kind !== 'high') continue;
    const gap = Math.abs(Date.parse(tide.time) - time);
    if (gap <= HIGH_TIDE_WINDOW_MS && gap < bestGap) {
      best = tide;
      bestGap = gap;
    }
  }
  return best;
}

export function isNearHighTide(isoTime: string, tides: TideEvent[]): boolean {
  return highTideNear(isoTime, tides) !== undefined;
}

function formatTemp(seaTempC: number | undefined): string {
  return seaTempC !== undefined ? ` and ${seaTempC.toFixed(1)}°C` : '';
}

export function assessSwimHour(
  hour: HourlyConditions,
  tides: TideEvent[],
  thresholds: SwimThresholds = DEFAULT_SWIM_THRESHOLDS
): SwimVerdictResult {
  const nearHighTide = isNearHighTide(hour.time, tides);
  if (isThunderstorm(hour)) {
    return { verdict: 'no', reason: THUNDERSTORM_REASON, nearHighTide };
  }
  const { waveHeightM, windSpeedKmh } = hour;

  if (windSpeedKmh < thresholds.greatWindKmh && waveHeightM <= thresholds.greatWaveM) {
    const tideNote = nearHighTide ? ' High tide too — in you get.' : '';
    return {
      verdict: 'great',
      reason: `Calm as a pond${formatTemp(hour.seaTempC)} — a lovely swim.${tideNote}`,
      nearHighTide,
    };
  }

  if (windSpeedKmh <= thresholds.okWindKmh && waveHeightM <= thresholds.okWaveM) {
    return {
      verdict: 'ok',
      reason: `A bit of chop at ${waveHeightM.toFixed(1)}m${formatTemp(hour.seaTempC)} — grand for a dip if you know the spot.`,
      nearHighTide,
    };
  }

  return {
    verdict: 'no',
    reason: `${Math.round(windSpeedKmh)}km/h wind and ${waveHeightM.toFixed(1)}m of sea — not a day for swimming.`,
    nearHighTide,
  };
}

/**
 * A bathing restriction overrides any conditions verdict — clean-looking
 * water can still be closed.
 */
export function applyWaterQuality(
  result: SwimVerdictResult,
  alert: WaterQualityAlert | undefined
): SwimVerdictResult {
  if (alert === undefined || !alert.restrictionInPlace) {
    return result;
  }
  return {
    verdict: 'no',
    reason: `A bathing restriction is in place at ${alert.beachName} — stay out until the council lifts it.`,
    nearHighTide: result.nearHighTide,
  };
}

/**
 * Swimmable (GREAT/OK) daylight runs from the hour in progress at `now`. Donabate
 * is shallow, so a run splits where it enters or leaves the ±2h band around
 * a high tide: a calm day reads as its high-tide window plus the low-water
 * stretches either side, never one all-day window labelled "high tide".
 * High-tide windows first, then chronological.
 */
export function findSwimWindows(
  hours: HourlyConditions[],
  tides: TideEvent[],
  spot: Spot,
  now: number,
  thresholds: SwimThresholds = DEFAULT_SWIM_THRESHOLDS
): SwimWindow[] {
  const windows: SwimWindow[] = [];
  let current: HourlyConditions[] = [];
  let currentTide: TideEvent | undefined;

  const flush = (): void => {
    const first = current[0];
    const last = current.at(-1);
    if (first !== undefined && last !== undefined) {
      const window: SwimWindow = {
        start: first.time,
        end: last.time,
        hours: [...current],
        nearHighTide: currentTide !== undefined,
      };
      if (currentTide !== undefined) window.highTide = currentTide.time;
      windows.push(window);
    }
    current = [];
    currentTide = undefined;
  };

  // Hours already over are not offered, so a window in progress starts now.
  const upcoming = hours.filter((hour) => Date.parse(hour.time) + HOUR_MS > now);
  for (const hour of upcoming) {
    const swimmable =
      isDaylightHour(hour.time, spot) && assessSwimHour(hour, tides, thresholds).verdict !== 'no';
    if (!swimmable) {
      flush();
      continue;
    }
    const tide = highTideNear(hour.time, tides);
    if (current.length > 0 && tide?.time !== currentTide?.time) flush();
    if (current.length === 0) currentTide = tide;
    current.push(hour);
  }
  flush();

  return windows.sort((a, b) => {
    if (a.nearHighTide !== b.nearHighTide) {
      return a.nearHighTide ? -1 : 1;
    }
    return a.start.localeCompare(b.start);
  });
}
