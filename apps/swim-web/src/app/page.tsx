import type { Metadata } from 'next';

import { DEFAULT_SPOT_ID } from '@tonnta/data';

import { SwimScreen } from '@/components/swim-screen';
import { spotMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return spotMetadata(DEFAULT_SPOT_ID);
}

export default function HomePage() {
  return <SwimScreen spotId={DEFAULT_SPOT_ID} />;
}
