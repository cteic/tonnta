import type { Metadata } from 'next';

import { DEFAULT_SPOT_ID } from '@tonnta/data';

/** Provisional name and domain (CTE-94). Change them here and nowhere else. */
export const SITE_NAME = 'Snámh';
export const SITE_LABEL = 'Sea swimming conditions';
export const SITE_DESCRIPTION =
  'Sea swimming conditions for Irish beaches: daylight swim windows, water temperature, tides and water-quality notices.';
export const PRODUCTION_HOST = 'snamh.app';
export const PRODUCTION_ORIGIN = `https://${PRODUCTION_HOST}`;
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_ORIGIN;

/** The surf product, linked from the footer. */
export const SURF_ORIGIN = 'https://tonnta.surf';

export type SpotPath = '/' | `/s/${string}`;

/** Donabate lives at `/`; every other spot at `/s/<id>`. */
export function spotPath(spotId: string): SpotPath {
  return spotId === DEFAULT_SPOT_ID ? '/' : `/s/${encodeURIComponent(spotId)}`;
}

/** The same spot on the surf site, which keeps the same path scheme. */
export function surfSpotUrl(spotId: string): string {
  return `${SURF_ORIGIN}${spotPath(spotId)}`;
}

/** True only for the live domain (with or without `www.`), port stripped. */
export function isProductionHost(host: string | null | undefined): boolean {
  if (typeof host !== 'string') return false;
  const bare = host.trim().toLowerCase().split(':')[0];
  return bare === PRODUCTION_HOST || bare === `www.${PRODUCTION_HOST}`;
}

/** Previews, workers.dev aliases and local builds stay out of search indexes. */
export function robotsFor(indexable: boolean): Metadata['robots'] {
  if (!indexable) return { index: false, follow: false };
  return { index: true, follow: true };
}
