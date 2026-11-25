import type { Board, DayFacts, HourlyConditions } from '@tonnta/types';

import { BOARD_LABEL, WIND_STATE_LABEL, compassPoint } from './format';

/**
 * The surf site shows facts and lets the surfer decide. These formatters turn
 * the forecast hour into plain values. Nothing here says whether to go: no
 * verdict, no reason sentence, no positive state. A missing value reads
 * "Unknown", never a default.
 */

export const UNKNOWN = 'Unknown';

export interface SurfHourFacts {
  /** "0.8m" */
  waveHeight: string;
  /** "9s" */
  wavePeriod: string;
  /** "14km/h" */
  windSpeed: string;
  /** "22km/h" */
  windGust: string;
  /** "WSW" */
  windDirection: string;
  /** Wind against the beach: "offshore", "cross-shore", "onshore" and so on. */
  windState: string;
  /** "12.4°C" */
  seaTemp: string;
}

function finite(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value);
}

function formatOr(value: number | undefined, format: (value: number) => string): string {
  return finite(value) ? format(value) : UNKNOWN;
}

export function surfHourFacts(hour: HourlyConditions | undefined): SurfHourFacts {
  return {
    waveHeight: formatOr(hour?.waveHeightM, (value) => `${value.toFixed(1)}m`),
    wavePeriod: formatOr(hour?.wavePeriodS, (value) => `${Math.round(value)}s`),
    windSpeed: formatOr(hour?.windSpeedKmh, (value) => `${Math.round(value)}km/h`),
    windGust: formatOr(hour?.windGustKmh, (value) => `${Math.round(value)}km/h`),
    windDirection: formatOr(hour?.windDirectionDeg, compassPoint),
    windState: hour === undefined ? UNKNOWN : WIND_STATE_LABEL[hour.windState],
    seaTemp: formatOr(hour?.seaTempC, (value) => `${value.toFixed(1)}°C`),
  };
}

/** One line of the hour's facts, for heroes that print a single row. */
export function surfFactsLine(facts: SurfHourFacts): string {
  return [
    `waves ${facts.waveHeight} @ ${facts.wavePeriod}`,
    `wind ${facts.windSpeed} ${facts.windDirection}, ${facts.windState}`,
    `gusts ${facts.windGust}`,
    `sea ${facts.seaTemp}`,
  ].join(' · ');
}

/** The board tag text, or undefined when the engine gives no board. */
export function boardTag(board: Board | undefined): string | undefined {
  return board === undefined ? undefined : BOARD_LABEL[board];
}

export interface DayFactsText {
  waves: string;
  period: string;
  wind: string;
  gusts: string;
}

function range(min: number, max: number, digits: number, unit: string): string {
  const low = min.toFixed(digits);
  const high = max.toFixed(digits);
  return low === high ? `${low}${unit}` : `${low}–${high}${unit}`;
}

export function dayFactsText(day: DayFacts): DayFactsText {
  return {
    waves: range(day.minWaveHeightM, day.maxWaveHeightM, 1, 'm'),
    period: range(day.minWavePeriodS, day.maxWavePeriodS, 0, 's'),
    wind: `${range(day.minWindSpeedKmh, day.maxWindSpeedKmh, 0, 'km/h')} ${compassPoint(day.windDirectionDeg)}`,
    gusts: `${Math.round(day.maxWindGustKmh)}km/h`,
  };
}
