import type { Metadata } from 'next';

import { DEFAULT_SPOT_ID, getSpot } from '@tonnta/data';
import { JsonLd } from '@tonnta/web-shell';

import { SpotScreen } from '@/components/spot-screen';
import { WebMcpTools } from '@/components/webmcp-tools';
import { indexingMetadata } from '@/lib/page-metadata';
import { buildHomeGraph } from '@/lib/structured-data';

export const dynamic = 'force-dynamic';

const BASE_METADATA: Metadata = {
  title: 'Donabate surf conditions today',
  description:
    'Surf conditions for Donabate beach, Co. Dublin: wave height and period, wind, tides, buoy readings and sea temperature, with a board tag. Rechecked every 15 minutes.',
  alternates: { canonical: '/' },
};

export async function generateMetadata(): Promise<Metadata> {
  return { ...BASE_METADATA, ...(await indexingMetadata()) };
}

export default async function HomePage() {
  const spot = getSpot(DEFAULT_SPOT_ID);

  return (
    <>
      <SpotScreen spotId={DEFAULT_SPOT_ID} />
      {spot === undefined ? null : <JsonLd data={buildHomeGraph(spot, new Date())} />}
      <WebMcpTools />
    </>
  );
}
