import type { MetadataRoute } from 'next';

import { BATHING_WATERS } from '@tonnta/data';

import { PRODUCTION_ORIGIN, beachPath } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${PRODUCTION_ORIGIN}/`, changeFrequency: 'daily' },
    ...BATHING_WATERS.map((water): MetadataRoute.Sitemap[number] => ({
      url: `${PRODUCTION_ORIGIN}${beachPath(water.slug)}`,
      changeFrequency: 'hourly',
    })),
  ];
}
