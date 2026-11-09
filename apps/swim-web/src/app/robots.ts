import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

import { PRODUCTION_ORIGIN, isProductionHost } from '@/lib/site';

export default async function robots(): Promise<MetadataRoute.Robots> {
  if (!isProductionHost((await headers()).get('host'))) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${PRODUCTION_ORIGIN}/sitemap.xml`,
  };
}
