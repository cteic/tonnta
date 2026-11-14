import type { Metadata } from 'next';

import { getSpot } from '@tonnta/data';

import { APP_IDENTITIES, spotPath } from './activity';
import { indexingMetadata } from './page-metadata';

export async function swimMetadata(spotId: string): Promise<Metadata> {
  const indexing = await indexingMetadata();
  const spot = getSpot(spotId);
  if (spot === undefined) return indexing;
  const title = `${spot.name} swimming conditions · ${APP_IDENTITIES.swim.name}`;
  const description = `Sea swimming conditions for ${spot.name}, ${spot.region}: daylight windows, water temperature, tides and water-quality notices. Check local advice before entering the water.`;
  return {
    ...indexing,
    title: { absolute: title },
    description,
    applicationName: APP_IDENTITIES.swim.name,
    keywords: ['swimming', spot.name, 'Ireland', 'sea temperature', 'tides', 'water quality'],
    alternates: { canonical: spotPath('swim', spotId) },
    manifest: '/swim/manifest.webmanifest',
    openGraph: {
      title,
      description,
      siteName: APP_IDENTITIES.swim.name,
      url: spotPath('swim', spotId),
      type: 'website',
      images: [],
    },
    twitter: { card: 'summary', title, description, images: [] },
  };
}
