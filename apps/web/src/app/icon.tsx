import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/** App icon: the wordmark initial over harbour water with a dawn-amber dot. */
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #0C1B22 0%, #16323B 100%)',
        color: '#E8ECEB',
        fontSize: 320,
        fontWeight: 700,
        fontFamily: 'sans-serif',
      }}
    >
      t<span style={{ color: '#E8A33D' }}>.</span>
    </div>,
    size
  );
}
