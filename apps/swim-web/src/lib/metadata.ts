import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { getSpot } from '@tonnta/data';

import { SITE_NAME, isProductionHost, robotsFor, spotPath } from './site';

export async function spotMetadata(spotId: string): Promise<Metadata> {
  const host = (await headers()).get('host');
  const robots = robotsFor(isProductionHost(host));
  const spot = getSpot(spotId);
  if (spot === undefined) return { robots };
  const title = `${spot.name} swimming conditions · ${SITE_NAME}`;
  const description = `Sea swimming conditions for ${spot.name}, ${spot.region}: daylight windows, water temperature, tides and water-quality notices. Check local advice before entering the water.`;
  return {
    robots,
    title: { absolute: title },
    description,
    keywords: ['swimming', spot.name, 'Ireland', 'sea temperature', 'tides', 'water quality'],
    alternates: { canonical: spotPath(spotId) },
    openGraph: { title, description, siteName: SITE_NAME, url: spotPath(spotId), type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}
