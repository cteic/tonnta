import type { HourlyConditions } from '@tonnta/types';

/** Runtime type guards — API responses are untrusted; no casts. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number');
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Numeric or null — ERDDAP emits nulls for missing readings. */
export function isNullableNumberArray(value: unknown): value is (number | null)[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number' || item === null);
}

export function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** Required physical inputs only: temperatures may legitimately be below zero. */
export function hasValidSurfInputs(hour: HourlyConditions): boolean {
  const nonNegative = (value: number): boolean => Number.isFinite(value) && value >= 0;
  const bearing = (value: number): boolean => nonNegative(value) && value <= 360;
  return (
    nonNegative(hour.waveHeightM) &&
    nonNegative(hour.wavePeriodS) &&
    (hour.waveHeightM === 0 || hour.wavePeriodS > 0) &&
    bearing(hour.waveDirectionDeg) &&
    nonNegative(hour.windSpeedKmh) &&
    nonNegative(hour.windGustKmh) &&
    bearing(hour.windDirectionDeg)
  );
}
