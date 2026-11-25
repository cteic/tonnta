import type { MetadataRoute } from 'next';

import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: `${SITE_NAME} — ${SITE_TAGLINE} ${SITE_DESCRIPTION}`,
    start_url: '/',
    display: 'standalone',
    background_color: '#0C1B22',
    theme_color: '#0C1B22',
    orientation: 'portrait-primary',
    categories: ['sports', 'weather', 'utilities'],
    icons: [
      {
        src: '/icon',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
