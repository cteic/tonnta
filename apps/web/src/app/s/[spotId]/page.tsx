import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getSpot } from '@tonnta/data';

import { SpotScreen } from '@/components/spot-screen';

export const dynamic = 'force-dynamic';

interface SpotPageProps {
  params: Promise<{ spotId: string }>;
}

export async function generateMetadata({ params }: SpotPageProps): Promise<Metadata> {
  const { spotId } = await params;
  const spot = getSpot(spotId);
  if (spot === undefined) {
    return {};
  }
  return {
    title: `${spot.name} surf conditions`,
    description: `Live surf verdict, wave and wind forecast for ${spot.name}, ${spot.region}.`,
  };
}

export default async function SpotPage({ params }: SpotPageProps) {
  const { spotId } = await params;
  if (getSpot(spotId) === undefined) {
    notFound();
  }
  return <SpotScreen spotId={spotId} />;
}
