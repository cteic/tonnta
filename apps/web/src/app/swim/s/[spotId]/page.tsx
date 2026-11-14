import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getSpot } from '@tonnta/data';

import { SpotScreen } from '@/components/spot-screen';
import { swimMetadata } from '@/lib/swim-metadata';

export const dynamic = 'force-dynamic';

interface SwimSpotPageProps {
  params: Promise<{ spotId: string }>;
}

export async function generateMetadata({ params }: SwimSpotPageProps): Promise<Metadata> {
  return swimMetadata((await params).spotId);
}

export default async function SwimSpotPage({ params }: SwimSpotPageProps) {
  const { spotId } = await params;
  if (getSpot(spotId) === undefined) notFound();
  return <SpotScreen spotId={spotId} activity="swim" />;
}
