import { DEFAULT_SPOT_ID } from '@tonnta/data';

export const APP_IDENTITY = { name: 'Tonnta', label: 'Surf conditions' } as const;

/** Swimming has its own site (CTE-93). Keep in step with the redirects in next.config.js. */
export const SWIM_ORIGIN = 'https://snamh.app';

export type SpotPath = '/' | `/s/${string}`;

/** Donabate lives at `/`; every other spot at `/s/<id>`. */
export function spotPath(spotId: string): SpotPath {
  return spotId === DEFAULT_SPOT_ID ? '/' : `/s/${encodeURIComponent(spotId)}`;
}

/** The same spot on the swim site, which uses the same path scheme. */
export function swimSpotUrl(spotId: string): string {
  return `${SWIM_ORIGIN}${spotPath(spotId)}`;
}
