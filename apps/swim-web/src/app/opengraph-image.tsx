import { ImageResponse } from 'next/og';

import { SITE_NAME } from '@/lib/site';

export const alt = `${SITE_NAME}: sea swimming conditions`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 80,
        background: '#0C1B22',
        color: '#E8ECEB',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: 76 }}>{SITE_NAME}</div>
      <div style={{ fontSize: 38, color: '#8FC1B5', marginTop: 32 }}>Sea swimming conditions</div>
      <div style={{ fontSize: 28, marginTop: 24 }}>
        Daylight · temperature · tides · water quality
      </div>
    </div>,
    size
  );
}
