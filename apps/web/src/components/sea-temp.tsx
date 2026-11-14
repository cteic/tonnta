'use client';

import { seaTempBand } from '@tonnta/data';
import type { SeaTempBand } from '@tonnta/data';

import { useAppTheme } from '@/themes/theme-context';

/** Thermometer scale, °C. Irish waters run about 8 to 19. */
const SCALE_MIN_C = 6;
const SCALE_MAX_C = 22;

const BAND_COLOUR: Record<SeaTempBand, string> = {
  baltic: '#6FA8DC',
  bracing: '#7FC4C4',
  fresh: '#8FC1B5',
  mild: '#E8C36A',
  warm: '#E8A33D',
};

interface ThermometerProps {
  seaTempC: number;
  colour: string;
}

function Thermometer({ seaTempC, colour }: ThermometerProps) {
  const fill = Math.min(1, Math.max(0, (seaTempC - SCALE_MIN_C) / (SCALE_MAX_C - SCALE_MIN_C)));
  const tubeTop = 6;
  const tubeBottom = 58;
  const level = tubeBottom - fill * (tubeBottom - tubeTop);
  return (
    <svg width="34" height="84" viewBox="0 0 34 84" aria-hidden="true">
      <rect
        x="11"
        y="2"
        width="12"
        height="62"
        rx="6"
        fill="none"
        stroke={colour}
        strokeWidth="2"
      />
      <rect x="14" y={level} width="6" height={tubeBottom - level + 6} rx="3" fill={colour} />
      <circle cx="17" cy="70" r="11" fill={colour} />
      {[0.25, 0.5, 0.75].map((tick) => (
        <line
          key={tick}
          x1="25"
          x2="30"
          y1={tubeBottom - tick * (tubeBottom - tubeTop)}
          y2={tubeBottom - tick * (tubeBottom - tubeTop)}
          stroke={colour}
          strokeWidth="1.5"
          opacity="0.6"
        />
      ))}
    </svg>
  );
}

interface SeaTempCardProps {
  seaTempC: number;
}

/** The sea temperature, up front: a thermometer, the band, and what to wear. */
export function SeaTempCard({ seaTempC }: SeaTempCardProps) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const band = seaTempBand(seaTempC);
  const colour = BAND_COLOUR[band.band];
  return (
    <div
      data-testid="sea-temp"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginTop: 22,
        padding: '14px 18px',
        maxWidth: 440,
        borderRadius: 16,
        border: `1px solid ${colour}`,
        background: 'rgba(12,27,34,0.35)',
      }}
    >
      <Thermometer seaTempC={seaTempC} colour={colour} />
      <div style={{ display: 'grid', gap: 4 }}>
        <span
          style={{
            fontFamily: "'Clash Display', sans-serif",
            fontWeight: 700,
            fontSize: 44,
            lineHeight: 1,
            letterSpacing: -1,
            color: tokens.text,
          }}
        >
          {seaTempC.toFixed(1)}
          <span style={{ fontSize: 20, color: tokens.textSoft }}>°C sea</span>
        </span>
        <span
          style={{
            fontFamily: "'General Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: colour,
          }}
        >
          {band.label}
        </span>
        <span style={{ fontSize: 14, lineHeight: 1.45, color: tokens.textMuted }}>
          {band.advice}
        </span>
      </div>
    </div>
  );
}
