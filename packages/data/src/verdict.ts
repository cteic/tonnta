import type {
  Board,
  HourlyConditions,
  Spot,
  VerdictResult,
  VerdictThresholds,
  WindState,
} from '@tonnta/types';

import { hasValidSurfInputs } from './guards';
import { THUNDERSTORM_REASON, isThunderstorm } from './weather';

/**
 * The verdict engine — Tonnta's whole point in ~100 lines.
 *
 * Regional modeled sea conditions are not a measurement of breaking surf.
 * Donabate adds a provisional short-period uncertainty gate to the launch
 * height/wind rules. It is not a locally calibrated prediction model.
 */

export type { VerdictThresholds };

/** Save with exact forecast snapshots; bump whenever surf assessment rules change. */
export const SURF_VERDICT_ENGINE_VERSION = 'donabate-short-period-v1';

export const DEFAULT_THRESHOLDS: VerdictThresholds = {
  flatBelowM: 0.3,
  goFromM: 0.4,
  maxWindKmh: 25,
  maxWindOffshoreKmh: 30,
  blownOnshoreKmh: 35,
};

const GLASSY_BELOW_KMH = 8;

/** Smallest angle between two compass bearings, 0–180. */
function angleBetween(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

/**
 * Classify wind relative to the beach. Wind direction is where the wind
 * comes FROM; offshore means it comes from behind the beach (facing + 180).
 */
export function classifyWind(
  windDirectionDeg: number,
  windSpeedKmh: number,
  spot: Spot
): WindState {
  if (windSpeedKmh < GLASSY_BELOW_KMH) {
    return 'glassy';
  }
  const offshoreFrom = (spot.facing + 180) % 360;
  const delta = angleBetween(windDirectionDeg, offshoreFrom);
  if (delta <= 45) return 'offshore';
  if (delta <= 80) return 'cross-off';
  if (delta <= 100) return 'cross';
  if (delta <= 135) return 'cross-on';
  return 'onshore';
}

function isOff(state: WindState): boolean {
  return state === 'offshore' || state === 'cross-off' || state === 'glassy';
}

function isOn(state: WindState): boolean {
  return state === 'onshore' || state === 'cross-on';
}

function pickBoard(hour: HourlyConditions): Board | undefined {
  const { waveHeightM, wavePeriodS, windSpeedKmh } = hour;
  if (waveHeightM >= 0.5 && waveHeightM <= 1.2 && wavePeriodS >= 5 && windSpeedKmh <= 20) {
    return 'longboard';
  }
  if (waveHeightM >= 0.4) {
    return 'foamie';
  }
  if (windSpeedKmh <= 15) {
    return 'sup';
  }
  return undefined;
}

function formatWave(heightM: number): string {
  return `${heightM.toFixed(1)}m`;
}

/** Effective thresholds for a spot — its own tuning, else the defaults. */
export function spotThresholds(spot: Spot): VerdictThresholds {
  return spot.thresholds ?? DEFAULT_THRESHOLDS;
}

export function assessHourWithReason(
  hour: HourlyConditions,
  spot: Spot,
  thresholds?: VerdictThresholds
): SurfAssessment {
  if (isThunderstorm(hour)) {
    return { verdict: 'blown', reasonCode: 'thunderstorm', reason: THUNDERSTORM_REASON };
  }
  // The source drops invalid hours. Defend callers using retained or custom data too,
  // without claiming that missing/invalid observations mean a flat sea.
  if (!hasValidSurfInputs(hour)) {
    return {
      verdict: 'maybe',
      reasonCode: 'invalid-forecast',
      reason: 'Forecast data is invalid; breaking surf is unconfirmed. Check locally.',
    };
  }
  const resolved = thresholds ?? spotThresholds(spot);
  const windState = classifyWind(hour.windDirectionDeg, hour.windSpeedKmh, spot);
  const { waveHeightM, windSpeedKmh } = hour;

  if (isOn(windState) && windSpeedKmh > resolved.blownOnshoreKmh) {
    return {
      verdict: 'blown',
      reasonCode: 'onshore-blown-out',
      reason: `Onshore ${Math.round(windSpeedKmh)}km/h has it blown out — save it for another day.`,
    };
  }

  if (waveHeightM < resolved.flatBelowM) {
    const board = pickBoard(hour);
    if (board === 'sup' && windState === 'glassy') {
      return {
        verdict: 'flat',
        board,
        reasonCode: 'flat-glassy',
        reason: 'Flat and glassy — no surf, but a lovely SUP.',
      };
    }
    return {
      verdict: 'flat',
      reasonCode: 'below-surf-height',
      reason: `Under ${formatWave(resolved.flatBelowM)} — nothing to ride today.`,
    };
  }

  const windCap = isOff(windState) ? resolved.maxWindOffshoreKmh : resolved.maxWindKmh;
  const rideable = waveHeightM >= resolved.goFromM;

  if (rideable && windSpeedKmh <= windCap) {
    if (resolved.minGoPeriodS !== undefined && hour.wavePeriodS < resolved.minGoPeriodS) {
      return {
        verdict: 'maybe',
        reasonCode: 'short-period-unconfirmed',
        reason: 'Short-period sea; breaking surf is unconfirmed. Check locally.',
      };
    }
    const board = pickBoard(hour);
    const windWord = isOff(windState) ? 'clean' : 'manageable';
    const result: SurfAssessment = {
      verdict: 'go',
      reasonCode: 'rideable-within-wind-limit',
      reason: `${formatWave(waveHeightM)} at ${Math.round(hour.wavePeriodS)}s and the wind is ${windWord} — worth going down.`,
    };
    if (board !== undefined) {
      result.board = board;
    }
    return result;
  }

  if (rideable) {
    const result: SurfAssessment = {
      verdict: 'maybe',
      reasonCode: 'wind-above-limit',
      reason: `${formatWave(waveHeightM)} showing but ${Math.round(windSpeedKmh)}km/h ${windState} wind — could be messy.`,
    };
    const board = pickBoard(hour);
    if (board !== undefined) {
      result.board = board;
    }
    return result;
  }

  return {
    verdict: 'maybe',
    reasonCode: 'borderline-height',
    reason: `${formatWave(waveHeightM)} — borderline; take the foamie if you're passing anyway.`,
  };
}

/** Stable, primary decision branch; never infer these codes by parsing prose. */
export const SURF_REASON_CODES = [
  'thunderstorm',
  'invalid-forecast',
  'onshore-blown-out',
  'flat-glassy',
  'below-surf-height',
  'short-period-unconfirmed',
  'rideable-within-wind-limit',
  'wind-above-limit',
  'borderline-height',
] as const;
export type SurfReasonCode = (typeof SURF_REASON_CODES)[number];
export interface SurfAssessment extends VerdictResult {
  reasonCode: SurfReasonCode;
}

/** Preserve the original assessment shape for persisted snapshots and existing callers. */
export function assessHour(
  hour: HourlyConditions,
  spot: Spot,
  thresholds?: VerdictThresholds
): VerdictResult {
  const { reasonCode, ...result } = assessHourWithReason(hour, spot, thresholds);
  void reasonCode;
  return result;
}
