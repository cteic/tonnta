import type { Metadata } from 'next';
import Link from 'next/link';

import { DEFAULT_SPOT_ID, getSpot } from '@tonnta/data';

import { SessionLogger } from '@/components/diary/session-logger';
import { indexingMetadata } from '@/lib/page-metadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Beach check log',
    description:
      'Record what you actually saw at the beach, with an optional personal surf rating. Kept on your own device.',
    alternates: { canonical: '/log' },
    ...(await indexingMetadata()),
  };
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ spot?: string | string[] }>;
}) {
  const query = await searchParams;
  const spotId =
    typeof query.spot === 'string' && getSpot(query.spot) !== undefined
      ? query.spot
      : DEFAULT_SPOT_ID;
  return (
    <>
      <nav style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px 0' }}>
        <Link
          href="/"
          style={{ fontFamily: "'Clash Display', sans-serif", fontWeight: 600, fontSize: 22 }}
        >
          tonnta<span style={{ color: '#E8A33D' }}>.</span>
        </Link>
      </nav>
      <main
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '16px 24px 48px',
          display: 'grid',
          gap: 16,
        }}
      >
        <header>
          <p style={{ margin: 0, fontSize: 12, color: '#A9BDBF' }}>Loga · Private beach log</p>
          <h1
            style={{ margin: '4px 0 0', fontFamily: "'Clash Display', sans-serif", fontSize: 32 }}
          >
            How was the beach?
          </h1>
        </header>
        <SessionLogger key={spotId} spotId={spotId} />
      </main>
    </>
  );
}
