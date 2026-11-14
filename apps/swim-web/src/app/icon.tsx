import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/** App icon: a swim initial over harbour water with a sea-green dot. */
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
      s<span style={{ color: '#8FC1B5' }}>.</span>
    </div>,
    size
  );
}
