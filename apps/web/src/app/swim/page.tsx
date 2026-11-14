import type { Metadata } from 'next';

import { DEFAULT_SPOT_ID } from '@tonnta/data';

import { SpotScreen } from '@/components/spot-screen';
import { swimMetadata } from '@/lib/swim-metadata';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return swimMetadata(DEFAULT_SPOT_ID);
}

export default function SwimPage() {
  return <SpotScreen spotId={DEFAULT_SPOT_ID} activity="swim" />;
}
