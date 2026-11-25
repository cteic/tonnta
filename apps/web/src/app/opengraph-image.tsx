import { ImageResponse } from 'next/og';

import { SITE_TAGLINE } from '@/lib/site';

export const alt = 'Tonnta — is it worth going down? Surf conditions for Donabate, Co. Dublin.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const HARBOUR = '#0C1B22';
const SEA_GLASS = '#8FC1B5';
const SLATE_SWELL = '#3E5C66';
const FOG = '#E8ECEB';
const DAWN_AMBER = '#E8A33D';

/** Link unfurl card: harbour water, rolling sea bands, the question. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        padding: '72px 80px',
        background: `linear-gradient(160deg, ${HARBOUR} 0%, #16323B 62%, #1E4450 100%)`,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          left: -160,
          right: -160,
          bottom: -300,
          height: 520,
          borderRadius: '50%',
          background: `linear-gradient(180deg, rgba(62,92,102,0.55) 0%, rgba(62,92,102,0) 70%)`,
          border: `2px solid ${SLATE_SWELL}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          left: -200,
          right: -200,
          bottom: -360,
          height: 520,
          borderRadius: '50%',
          background: `linear-gradient(180deg, rgba(143,193,181,0.42) 0%, rgba(143,193,181,0) 66%)`,
          border: `2px solid rgba(143,193,181,0.55)`,
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: SEA_GLASS,
          }}
        >
          Donabate · Co. Dublin
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 22,
            fontSize: 92,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1.05,
            color: FOG,
            maxWidth: 900,
          }}
        >
          {SITE_TAGLINE}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 26,
            fontSize: 34,
            lineHeight: 1.35,
            color: '#C6D2D2',
            maxWidth: 820,
          }}
        >
          Live verdict, board call, tides and buoy readings — the whole sea in five seconds.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', fontSize: 46, fontWeight: 700, color: FOG }}>
          tonnta<span style={{ color: DAWN_AMBER }}>.</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {['GO', 'MAYBE', 'FLAT', 'BLOWN OUT'].map((word) => (
            <div
              key={word}
              style={{
                display: 'flex',
                padding: '10px 20px',
                borderRadius: 999,
                border: `2px solid ${word === 'GO' ? DAWN_AMBER : 'rgba(232,236,235,0.28)'}`,
                color: word === 'GO' ? DAWN_AMBER : '#A9BDBF',
                fontSize: 22,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              {word}
            </div>
          ))}
        </div>
      </div>
    </div>,
    size
  );
}
