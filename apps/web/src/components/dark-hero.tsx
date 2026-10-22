'use client';

import { formatHour } from '@tonnta/data';
import type { Spot, SwimVerdictResult, VerdictResult } from '@tonnta/types';

import { VERDICT_LABEL } from '@/lib/format';
import { useAppTheme } from '@/themes/theme-context';

const SWIM_LABEL: Record<string, string> = {
  great: 'PERFECT',
  ok: 'GRAND',
  no: 'NOT TODAY',
};

interface DarkHeroProps {
  spot: Spot;
  mode: 'surf' | 'snamh';
  sunrise?: string | undefined;
  firstLightTime?: string | undefined;
  surf?: VerdictResult | undefined;
  swim?: SwimVerdictResult | undefined;
}

function firstLightPreview(
  mode: 'surf' | 'snamh',
  surf: VerdictResult | undefined,
  swim: SwimVerdictResult | undefined
): string | undefined {
  if (mode === 'surf') {
    return surf === undefined
      ? undefined
      : `${VERDICT_LABEL[surf.verdict].english}. ${surf.reason}`;
  }
  return swim === undefined
    ? undefined
    : `${SWIM_LABEL[swim.verdict] ?? 'NOT TODAY'}. ${swim.reason}`;
}

/**
 * After dark there is no verdict: nobody should be in the water. The hero
 * gives the next sunrise and what first light looks like instead. One hero
 * for every theme, so the safety message reads the same in all of them.
 */
export function DarkHero({ spot, mode, sunrise, firstLightTime, surf, swim }: DarkHeroProps) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const preview = firstLightPreview(mode, surf, swim);
  // The first light hour can start a few minutes before sunrise; never show a time before it.
  const firstLightAt =
    firstLightTime !== undefined && sunrise !== undefined && sunrise > firstLightTime
      ? sunrise
      : firstLightTime;

  return (
    <header
      data-testid="dark-hero"
      style={{
        position: 'relative',
        background: 'linear-gradient(180deg, #070F14 0%, #0C1B22 70%, #122630 100%)',
        overflow: 'hidden',
        padding: '12px 0 64px',
      }}
    >
      <svg
        aria-hidden="true"
        width="120"
        height="120"
        viewBox="0 0 120 120"
        style={{ position: 'absolute', right: 24, top: 18, opacity: 0.9 }}
      >
        <circle cx="64" cy="56" r="30" fill="#E8ECEB" />
        <circle cx="78" cy="46" r="28" fill="#0B161E" />
      </svg>
      <div style={{ position: 'relative', maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
        <p
          style={{
            margin: 0,
            fontFamily: "'General Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: tokens.textSoft,
          }}
        >
          Dorcha · Dark
        </p>
        <h1
          style={{
            margin: '2px 0 10px',
            fontFamily: "'Clash Display', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(44px, 11vw, 80px)',
            lineHeight: 0.98,
            letterSpacing: '-0.02em',
            color: '#E8ECEB',
          }}
        >
          <span className="tonnta-visually-hidden">{spot.name}: </span>
          Out of the water
        </h1>
        <p style={{ margin: 0, maxWidth: 440, fontSize: 16, lineHeight: 1.5, color: '#9FB0B3' }}>
          It is dark at {spot.name}, so there is no verdict until it is light.
          {sunrise !== undefined ? ` Sunrise is at ${formatHour(sunrise, spot.timezone)}.` : ''}
        </p>
        {preview !== undefined && firstLightAt !== undefined ? (
          <p
            style={{
              margin: '18px 0 0',
              maxWidth: 440,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid #22404C',
              background: 'rgba(18,38,48,0.6)',
              fontSize: 14,
              lineHeight: 1.5,
              color: '#C9D4D2',
            }}
          >
            <strong style={{ color: '#E8ECEB' }}>
              First light, {formatHour(firstLightAt, spot.timezone)}:
            </strong>{' '}
            {preview}
          </p>
        ) : null}
      </div>
    </header>
  );
}
