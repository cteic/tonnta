import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { DEFAULT_SPOT_ID, getSpot } from '@tonnta/data';

import { SpotScreen } from '@/components/spot-screen';
import { indexingMetadata } from '@/lib/page-metadata';

export const dynamic = 'force-dynamic';

interface SpotPageProps {
  params: Promise<{ spotId: string }>;
}

/**
 * These URLs are in the sitemap, so they need the same per-host indexing
 * directives every other public page gets. The default spot canonicalises to
 * `/`, which serves the same screen.
 */
export async function generateMetadata({ params }: SpotPageProps): Promise<Metadata> {
  const { spotId } = await params;
  const indexing = await indexingMetadata();
  const spot = getSpot(spotId);
  if (spot === undefined) {
    return indexing;
  }
  return {
    ...indexing,
    title: `${spot.name} surf conditions`,
    description: `Live surf verdict, wave and wind forecast for ${spot.name}, ${spot.region}.`,
    alternates: { canonical: spot.id === DEFAULT_SPOT_ID ? '/' : `/s/${spot.id}` },
  };
}

export default async function SpotPage({ params }: SpotPageProps) {
  const { spotId } = await params;
  if (getSpot(spotId) === undefined) {
    notFound();
  }
  return <SpotScreen spotId={spotId} />;
}
