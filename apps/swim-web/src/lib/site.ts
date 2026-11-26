import type { Metadata } from 'next';

/** Provisional name and domain (CTE-94). Change them here and nowhere else. */
export const SITE_NAME = 'Snámh';
export const SITE_LABEL = 'Irish bathing water facts';
export const SITE_DESCRIPTION =
  'Official facts for the EPA bathing waters in Ireland: alerts, water quality rating, lifeguard cover and the bathing season, next to weather and sea model values.';
export const PRODUCTION_HOST = 'snamh.app';
export const PRODUCTION_ORIGIN = `https://${PRODUCTION_HOST}`;
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_ORIGIN;

/** The surf product, linked from the footer. */
export const SURF_ORIGIN = 'https://tonnta.surf';

export type BeachPath = `/s/${string}`;

export function beachPath(slug: string): BeachPath {
  return `/s/${encodeURIComponent(slug)}`;
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
