import { getSpot } from '@tonnta/data';
import type { Spot } from '@tonnta/types';

/**
 * Expo Router hands `/s/[spotId]` its param as `string | string[] | undefined`
 * (repeated query keys arrive as arrays). Normalise that into a spot id and
 * look it up in the registry, so the screen only deals with a `Spot`.
 */

const SPOT_ID_PATTERN = /^[a-z0-9-]+$/;

export interface SpotRoute {
  /** Normalised id from the URL, or undefined when the param was empty. */
  spotId: string | undefined;
  /** The registry entry, or undefined when the id is unknown. */
  spot: Spot | undefined;
}

export function parseSpotParam(param: unknown): string | undefined {
  const raw = Array.isArray(param) ? param[0] : param;
  if (typeof raw !== 'string') {
    return undefined;
  }
  const normalised = raw.trim().toLowerCase();
  return SPOT_ID_PATTERN.test(normalised) ? normalised : undefined;
}

export function resolveSpotRoute(param: unknown): SpotRoute {
  const spotId = parseSpotParam(param);
  return { spotId, spot: spotId === undefined ? undefined : getSpot(spotId) };
}
