import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getSpot } from '@tonnta/data';

import { SwimScreen } from '@/components/swim-screen';
import { spotMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

interface SpotPageProps {
  params: Promise<{ spotId: string }>;
}

export async function generateMetadata({ params }: SpotPageProps): Promise<Metadata> {
  return spotMetadata((await params).spotId);
}

export default async function SpotPage({ params }: SpotPageProps) {
  const { spotId } = await params;
  if (getSpot(spotId) === undefined) notFound();
  return <SwimScreen spotId={spotId} />;
}
