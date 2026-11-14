import type { MetadataRoute } from 'next';

import { APP_IDENTITIES } from '@/lib/activity';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/swim',
    name: APP_IDENTITIES.swim.name,
    short_name: APP_IDENTITIES.swim.name,
    description:
      'Sea swimming conditions, daylight windows, temperature, tides and water-quality notices.',
    start_url: '/swim',
    scope: '/swim',
    display: 'standalone',
    background_color: '#0C1B22',
    theme_color: '#0C1B22',
    categories: ['sports', 'weather', 'utilities'],
    icons: [{ src: '/swim/icon', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}
