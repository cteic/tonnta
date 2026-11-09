import type { MetadataRoute } from 'next';

import { SITE_NAME } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: SITE_NAME,
    short_name: SITE_NAME,
    description:
      'Sea swimming conditions, daylight windows, temperature, tides and water-quality notices.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0C1B22',
    theme_color: '#0C1B22',
    categories: ['sports', 'weather', 'utilities'],
    icons: [{ src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}
