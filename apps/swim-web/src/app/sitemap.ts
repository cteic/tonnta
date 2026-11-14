import type { MetadataRoute } from 'next';

import { SPOTS } from '@tonnta/data';

import { PRODUCTION_ORIGIN, spotPath } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return SPOTS.map((spot) => ({
    url: `${PRODUCTION_ORIGIN}${spotPath(spot.id)}`,
    changeFrequency: 'hourly',
  }));
}
