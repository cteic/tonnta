import type { Spot } from '@tonnta/types';

import { getSpot } from './spots';
import { spotThresholds } from './verdict';

/**
 * Provenance for the existing registry, not approval to expand the beta.
 * Increment a profile version whenever its coordinates, timezone, facing,
 * station mappings or effective scoring thresholds change. Tests pin the values.
 */
export const SPOT_PROFILE_PROVENANCE = {
  donabate: {
    version: 'donabate-v1',
    scope: 'launch-candidate',
    source: 'packages/data/src/spots.ts',
    evidence: 'docs/surf-spot-profiles.md#donabate',
    calibration: 'provisional',
  },
  'el-cotillo': {
    version: 'el-cotillo-v1',
    scope: 'existing-unconfirmed-beta',
    source: 'packages/data/src/spots.ts',
    evidence: 'docs/surf-spot-profiles.md#el-cotillo',
    calibration: 'provisional',
  },
  corralejo: {
    version: 'corralejo-v1',
    scope: 'existing-unconfirmed-beta',
    source: 'packages/data/src/spots.ts',
    evidence: 'docs/surf-spot-profiles.md#corralejo',
    calibration: 'provisional',
  },
} as const;

/** Do not label custom configurations with the registered profile's version. */
export function surfProfileVersion(spot: Spot): string | null {
  const registered = getSpot(spot.id);
  if (registered === undefined) return null;
  const keys = [
    'latitude',
    'longitude',
    'timezone',
    'facing',
    'tideStationId',
    'buoyStationId',
    'tideGaugeId',
    'epaBeachId',
  ] as const;
  if (keys.some((key) => spot[key] !== registered[key])) return null;
  const actual = spotThresholds(spot);
  const expected = spotThresholds(registered);
  if (
    Object.keys(expected).some(
      (key) => actual[key as keyof typeof actual] !== expected[key as keyof typeof expected]
    ) ||
    actual.minGoPeriodS !== expected.minGoPeriodS
  )
    return null;
  return SPOT_PROFILE_PROVENANCE[spot.id as keyof typeof SPOT_PROFILE_PROVENANCE]?.version ?? null;
}
