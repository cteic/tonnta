import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { buildRobotsMetadata } from '@/lib/discoverability';
import { isProductionHost } from '@/lib/site';

/**
 * Indexing directives for whichever host served this request.
 *
 * Verified against the live hosts on 21 Oct 2026, now the app deploys through
 * OpenNext on Workers. Versioned preview URLs
 * (`<version>-tonnta-web.*.workers.dev`) do carry `X-Robots-Tag: noindex`
 * from Cloudflare, but two indexable copies of the site do not: the stable
 * `tonnta-web.*.workers.dev` alias and the superseded `tonnta.pages.dev`
 * deployment both return 200 with no such header. The app has to say it.
 */
export async function indexingMetadata(): Promise<Pick<Metadata, 'robots'>> {
  const requestHeaders = await headers();
  return { robots: buildRobotsMetadata(isProductionHost(requestHeaders.get('host'))) };
}
