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
