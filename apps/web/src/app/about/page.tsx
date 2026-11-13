import type { Metadata } from 'next';
import Link from 'next/link';

import { AppFooter } from '@/components/app-footer';
import { indexingMetadata } from '@/lib/page-metadata';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'About this information',
    description:
      'Where Tonnta gets its surf data, what the board tag means, and why it is information, not advice.',
    alternates: { canonical: '/about' },
    ...(await indexingMetadata()),
  };
}

interface SourceRow {
  name: string;
  what: string;
  licence?: string;
}

const SOURCES: readonly SourceRow[] = [
  {
    name: 'Marine Institute',
    what: 'Live buoy readings (waves, period, wind, sea temperature) and tide predictions. Buoys sit offshore, so they measure open water, not the beach.',
    licence: 'CC BY 4.0',
  },
  {
    name: 'Met Éireann',
    what: 'The Irish national weather service, credited for weather data.',
  },
  {
    name: 'Open-Meteo',
    what: 'Hourly wave, wind and sea temperature forecasts. These are model estimates for open water near the beach, not measurements. Breaking waves at the beach are often smaller.',
    licence: 'CC BY 4.0',
  },
];

export default function AboutPage() {
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
          lineHeight: 1.6,
        }}
      >
        <h1 style={{ margin: '4px 0 0', fontFamily: "'Clash Display', sans-serif", fontSize: 32 }}>
          About this information
        </h1>

        <section>
          <h2 style={{ fontSize: 18 }}>Information, not advice</h2>
          <p>
            Tonnta shows surf conditions: wave height and period, wind, tides, buoy readings, sea
            temperature, sunrise and sunset. It does not tell you whether to go in. You decide,
            using what you see at the beach and your own experience.
          </p>
          <p>
            When a source does not load, or a value is missing, Tonnta shows &ldquo;Unknown&rdquo;.
            It never fills the gap with a guess.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18 }}>Where the data comes from</h2>
          <ul style={{ paddingLeft: 20 }}>
            {SOURCES.map((source) => (
              <li key={source.name} style={{ marginBottom: 8 }}>
                <strong>{source.name}</strong>
                {source.licence === undefined ? '' : ` (${source.licence})`}: {source.what}
              </li>
            ))}
          </ul>
          <p>
            Tide heights are in metres relative to mean sea level. Offshore, cross-shore and onshore
            describe the wind direction against the way the beach faces.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18 }}>The board tag</h2>
          <p>
            The board tag (Foamie, SUP or Longboard) is a rough guide to kit only, worked out from
            the forecast wave height, period and wind. It is not a rating of the surf and does not
            say the sea is safe. When the forecast gives no fit, there is no tag.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: 18 }}>In an emergency</h2>
          <p>
            <strong>In an emergency call 112 or 999 and ask for the Coast Guard.</strong>
          </p>
        </section>
      </main>
      <AppFooter />
    </>
  );
}
