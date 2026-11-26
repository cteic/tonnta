import type { BuoyObservation } from '@tonnta/types';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** Buoys report hourly; three missed reports means the reading is no longer current. */
export const BUOY_STALE_AFTER_MS = 3 * HOUR_MS;

export interface BuoyFact {
  label: string;
  value: string;
}

export type BuoyFacts =
  | { status: 'missing' }
  | { status: 'observed'; observedAt: string; age: string; stale: boolean; facts: BuoyFact[] };

export function formatObservationAge(elapsedMs: number): string {
  const minutes = Math.max(0, Math.floor(elapsedMs / MINUTE_MS));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function compass(degrees: number): string {
  const index = Math.round((((degrees % 360) + 360) % 360) / 45) % COMPASS.length;
  return COMPASS[index] ?? 'N';
}

function reading(value: string | undefined): string {
  return value ?? 'Not reported';
}

/** Every field the buoy did not report says so, rather than disappearing. */
export function buoyFacts(observation: BuoyObservation | undefined, now: number): BuoyFacts {
  if (observation === undefined) return { status: 'missing' };
  const observedMs = Date.parse(observation.time);
  if (!Number.isFinite(observedMs)) return { status: 'missing' };

  const { waveHeightM, wavePeriodS, windSpeedKmh, windDirectionDeg, seaTempC } = observation;
  const wind =
    windSpeedKmh === undefined
      ? undefined
      : `${Math.round(windSpeedKmh)} km/h${windDirectionDeg === undefined ? '' : ` from ${compass(windDirectionDeg)}`}`;
  return {
    status: 'observed',
    observedAt: new Date(observedMs).toISOString(),
    age: formatObservationAge(now - observedMs),
    stale: now - observedMs > BUOY_STALE_AFTER_MS,
    facts: [
      {
        label: 'Waves',
        value: reading(waveHeightM === undefined ? undefined : `${waveHeightM.toFixed(1)} m`),
      },
      {
        label: 'Period',
        value: reading(wavePeriodS === undefined ? undefined : `${Math.round(wavePeriodS)} s`),
      },
      { label: 'Wind', value: reading(wind) },
      {
        label: 'Sea',
        value: reading(seaTempC === undefined ? undefined : `${seaTempC.toFixed(1)} °C`),
      },
    ],
  };
}
