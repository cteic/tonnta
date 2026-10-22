import type {
  HourlyConditions,
  Spot,
  SwimVerdictResult,
  TideEvent,
  WaterQualityAlert,
} from '@tonnta/types';

import { isSessionTime } from './summary';

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

export interface SwimWindow {
  start: string; // ISO time of first swimmable hour (UTC)
  end: string; // ISO time of last swimmable hour (UTC)
  hours: HourlyConditions[];
  /** Any hour of the window falls within ±2h of a high tide. */
  nearHighTide: boolean;
}

export function isNearHighTide(isoTime: string, tides: TideEvent[]): boolean {
  const time = new Date(isoTime).getTime();
  if (Number.isNaN(time)) {
    return false;
  }
  return tides.some((tide) => {
    if (tide.kind !== 'high') {
      return false;
    }
    const tideTime = new Date(tide.time).getTime();
    return !Number.isNaN(tideTime) && Math.abs(tideTime - time) <= HIGH_TIDE_WINDOW_MS;
  });
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
 * Contiguous swimmable (GREAT/OK) runs within session hours, high-tide
 * windows first, then chronological.
 */
export function findSwimWindows(
  hours: HourlyConditions[],
  tides: TideEvent[],
  spot: Spot,
  thresholds: SwimThresholds = DEFAULT_SWIM_THRESHOLDS
): SwimWindow[] {
  const windows: SwimWindow[] = [];
  let current: HourlyConditions[] = [];

  const flush = (): void => {
    if (current.length === 0) {
      return;
    }
    const first = current[0];
    const last = current[current.length - 1];
    if (first !== undefined && last !== undefined) {
      windows.push({
        start: first.time,
        end: last.time,
        hours: [...current],
        nearHighTide: current.some((hour) => isNearHighTide(hour.time, tides)),
      });
    }
    current = [];
  };

  for (const hour of hours) {
    const swimmable =
      isSessionTime(hour.time, spot.timezone) &&
      assessSwimHour(hour, tides, thresholds).verdict !== 'no';
    if (swimmable) {
      current.push(hour);
    } else {
      flush();
    }
  }
  flush();

  return windows.sort((a, b) => {
    if (a.nearHighTide !== b.nearHighTide) {
      return a.nearHighTide ? -1 : 1;
    }
    return a.start.localeCompare(b.start);
  });
}
