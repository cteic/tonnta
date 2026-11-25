export const SITE_NAME = 'Tonnta';
export const SITE_TAGLINE = 'Is it worth going down?';
export const SITE_DESCRIPTION =
  'Live surf conditions, verdict and board call for Donabate — waves, wind, tides and alerts.';

/**
 * The one host that is allowed into a search index. Everything else — Pages
 * branch previews, local dev, the bare *.pages.dev alias — is a copy of the
 * site and must stay out.
 */
export const PRODUCTION_ORIGIN = 'https://tonnta.surf';
export const PRODUCTION_HOST = 'tonnta.surf';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_ORIGIN;

/** True only for the live domain (with or without `www.`), port stripped. */
export function isProductionHost(host: string | null | undefined): boolean {
  if (typeof host !== 'string') {
    return false;
  }
  const bare = host.trim().toLowerCase().split(':')[0];
  if (bare === undefined || bare.length === 0) {
    return false;
  }
  return bare === PRODUCTION_HOST || bare === `www.${PRODUCTION_HOST}`;
}

/** Alert worker origin + VAPID public key — deploy constants, not secrets. */
export const ALERTS_URL =
  process.env.NEXT_PUBLIC_ALERTS_URL ?? 'https://tonnta-worker.pete-9c4.workers.dev';
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
  'BKlE-_RCvR9BEgzGRE4i51xQlYaG9yK-DxVHAldx_7rT7_Sin28Ua_AWhmj-mkKFaj77LkTRALJadRJMpcWH3O4';
