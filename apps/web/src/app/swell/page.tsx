import type { Metadata } from 'next';
import Link from 'next/link';

import { AppFooter } from '@/components/app-footer';
import { SwellMapView } from '@/components/swell-map-view';
import { indexingMetadata } from '@/lib/page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Swell map',
    description:
      'Open-ocean swell across the North-East Atlantic for the next 16 days: each swell with its own height, period and direction.',
    alternates: { canonical: '/swell' },
    ...(await indexingMetadata()),
  };
}

export default function SwellPage() {
  return (
    <>
      <nav style={{ maxWidth: 760, margin: '0 auto', padding: '28px 24px 0' }}>
        <Link
          href="/"
          style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 22 }}
        >
          tonnta<span style={{ color: '#E8A33D' }}>.</span>
        </Link>
      </nav>
      <main
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '16px 24px 48px',
          display: 'grid',
          gap: 16,
          lineHeight: 1.6,
        }}
      >
        <h1 style={{ margin: '4px 0 0', fontFamily: "'Clash Display', sans-serif", fontSize: 32 }}>
          Swell map
        </h1>
        <p style={{ margin: 0 }}>
          Open-ocean swell, not beach surf. Each swell shows its own height (colour), and its
          direction and period (the crest marks: they lie along the wave crest, and run longer for
          longer-period swell). The red dot is Donabate.
        </p>

        <SwellMapView />

        <p style={{ margin: 0, fontSize: 14 }}>
          Source: NOAA GFS-Wave model, a grid of about 17 by 28 km at Irish latitudes. It cannot see
          bays, sandbars or headlands, so waves at the beach often differ. Heights are significant
          wave height in metres. This is information, not advice.
        </p>
      </main>
      <AppFooter />
    </>
  );
}
