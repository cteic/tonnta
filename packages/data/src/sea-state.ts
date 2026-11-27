import type { HourlyConditions } from '@tonnta/types';

/**
 * One word for the look of the water surface this hour, each tied to a number
 * rule. It describes the sea, not whether to go: no quality words, no advice.
 * When no rule fits, or a value is missing, there is no word.
 */

export type SeaStateWord = 'Flat' | 'Glassy' | 'Clean' | 'Choppy';

export interface SeaState {
  word: SeaStateWord;
  /** The number rule behind the word, for example "wind under 8km/h". */
  rule: string;
}

export const SEA_STATE_FLAT_BELOW_M = 0.3;
export const SEA_STATE_GLASSY_BELOW_KMH = 8;
export const SEA_STATE_CLEAN_BELOW_KMH = 30;
export const SEA_STATE_CHOPPY_FROM_KMH = 15;

function finite(value: number): boolean {
  return Number.isFinite(value);
}

export function seaStateFor(hour: HourlyConditions | undefined): SeaState | undefined {
  if (hour === undefined) return undefined;
  if (!finite(hour.waveHeightM) || !finite(hour.windSpeedKmh)) return undefined;
  // Compare the numbers as the page prints them (0.1m, whole km/h), so the
  // word never contradicts the figure beside it.
  const waveHeightM = Math.round(hour.waveHeightM * 10) / 10;
  const windSpeedKmh = Math.round(hour.windSpeedKmh);
  const { windState } = hour;

  if (waveHeightM < SEA_STATE_FLAT_BELOW_M) {
    return { word: 'Flat', rule: `waves under ${SEA_STATE_FLAT_BELOW_M}m` };
  }
  // The forecast's own wind state, so the word matches the "glassy" wind label.
  if (windState === 'glassy' || windSpeedKmh < SEA_STATE_GLASSY_BELOW_KMH) {
    return { word: 'Glassy', rule: `wind under ${SEA_STATE_GLASSY_BELOW_KMH}km/h` };
  }
  if (
    (windState === 'offshore' || windState === 'cross-off') &&
    windSpeedKmh < SEA_STATE_CLEAN_BELOW_KMH
  ) {
    return { word: 'Clean', rule: `offshore wind under ${SEA_STATE_CLEAN_BELOW_KMH}km/h` };
  }
  if (
    (windState === 'cross' || windState === 'cross-on' || windState === 'onshore') &&
    windSpeedKmh >= SEA_STATE_CHOPPY_FROM_KMH
  ) {
    return {
      word: 'Choppy',
      rule: `cross or onshore wind ${SEA_STATE_CHOPPY_FROM_KMH}km/h or more`,
    };
  }
  return undefined;
}
