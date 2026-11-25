import type { MetadataRoute } from 'next';

import { buildSitemapEntries } from '@/lib/discoverability';
import { SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries(SITE_URL, new Date());
}
