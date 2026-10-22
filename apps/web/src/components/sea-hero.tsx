'use client';

import type { HourlyConditions, VerdictResult } from '@tonnta/types';

import { BOARD_LABEL, VERDICT_LABEL, WIND_STATE_LABEL, compassPoint } from '@/lib/format';
import { useAppTheme } from '@/themes/theme-context';

/**
 * The living sea — Tonnta's signature. Three drifting sine bands whose
 * amplitude, wavelength, speed and colour are computed from the real
 * conditions: glassy days barely move, clean swell rolls in ordered bands,
 * onshore mess is short and jittery. The sea IS the data visualisation.
 */

interface SeaHeroProps {
  verdict: VerdictResult;
  hour?: HourlyConditions | undefined;
}

const VERDICT_SEA: Record<string, string> = {
  go: '#5E9A8C',
  maybe: '#557D86',
  flat: '#9FB8B3',
  blown: '#4A5A61',
};

interface BandSpec {
  amplitude: number;
  wavelength: number;
  durationS: number;
  opacity: number;
  offsetY: number;
}

function buildWavePath(
  amplitude: number,
  wavelength: number,
  width: number,
  baseY: number
): string {
  const half = wavelength / 2;
  let d = `M0 ${baseY}`;
  for (let x = 0; x < width; x += wavelength) {
    d += ` q ${half / 2} ${-amplitude * 2} ${half} 0 q ${half / 2} ${amplitude * 2} ${half} 0`;
  }
  d += ` V 220 H 0 Z`;
  return d;
}

function bandSpecs(hour: HourlyConditions | undefined): BandSpec[] {
  const wave = hour?.waveHeightM ?? 0.2;
  const windState = hour?.windState ?? 'glassy';
  const messy = windState === 'onshore' || windState === 'cross-on';
  const glassy = windState === 'glassy';

  // 0.1m ripple → ~3px band; 1.2m swell → ~26px
  const amplitude = Math.max(3, Math.min(26, wave * 22));
  // Messy sea = short chop; clean = long ordered lines
  const wavelength = messy ? 90 : 220;
  // Fast drift when windy, near-still when glassy
  let baseDuration = 24;
  if (glassy) baseDuration = 46;
  if (messy) baseDuration = 12;

  return [
    {
      amplitude: amplitude * 0.55,
      wavelength: wavelength * 1.35,
      durationS: baseDuration * 1.6,
      opacity: 0.28,
      offsetY: 6,
    },
    { amplitude: amplitude * 0.8, wavelength, durationS: baseDuration, opacity: 0.45, offsetY: 26 },
    {
      amplitude,
      wavelength: wavelength * 0.75,
      durationS: baseDuration * 0.7,
      opacity: 0.85,
      offsetY: 48,
    },
  ];
}

export function SeaBands({
  hour,
  verdict,
  colour,
}: {
  hour: HourlyConditions | undefined;
  verdict: string;
  /** Explicit band colour (themes override the default verdict mapping). */
  colour?: string | undefined;
}) {
  const resolved = colour ?? VERDICT_SEA[verdict] ?? '#557D86';
  const bands = bandSpecs(hour);
  const width = 1440;

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {bands.map((band, index) => (
        <div
          key={index}
          className="tonnta-sea-band"
          data-tonnta-animated
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 220,
            animation: `tonntaDrift ${band.durationS}s linear infinite`,
            width: width * 2,
          }}
        >
          <svg
            width={width * 2}
            height={220}
            viewBox={`0 0 ${width * 2} 220`}
            preserveAspectRatio="none"
            style={{ display: 'block', height: '100%', width: '100%' }}
          >
            <path
              d={buildWavePath(band.amplitude, band.wavelength, width * 2, 80 + band.offsetY)}
              fill={resolved}
              opacity={band.opacity}
            />
          </svg>
        </div>
      ))}
    </div>
  );
}

export function SeaHero({ verdict, hour }: SeaHeroProps) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const label = VERDICT_LABEL[verdict.verdict];
  const isGo = verdict.verdict === 'go';

  return (
    <header
      style={{
        position: 'relative',
        background: tokens.heroGradient,
        overflow: 'hidden',
        paddingBottom: 150,
      }}
    >
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 720,
          margin: '0 auto',
          padding: '12px 24px 0',
        }}
      >
        <div className="tonnta-surface-in">
          <p
            style={{
              margin: 0,
              fontFamily: "'General Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: isGo ? tokens.accent : tokens.textSoft,
            }}
          >
            {label.irish}
          </p>
          <h1
            style={{
              margin: '2px 0 10px',
              fontFamily: "'Clash Display', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(56px, 14vw, 96px)',
              lineHeight: 0.98,
              letterSpacing: '-0.02em',
              color: isGo ? tokens.accent : tokens.text,
            }}
          >
            <span className="tonnta-visually-hidden">Donabate surf today — </span>
            {label.english}
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 440,
              fontSize: 16,
              lineHeight: 1.5,
              color: tokens.textMuted,
            }}
          >
            {verdict.reason}
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 12,
              marginTop: 22,
            }}
          >
            {verdict.board !== undefined ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: isGo ? tokens.accent : tokens.accentSoftBg,
                  color: isGo ? tokens.accentContrast : tokens.accent,
                  fontFamily: "'Clash Display', sans-serif",
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                {BOARD_LABEL[verdict.board]} day
              </span>
            ) : null}
            {hour !== undefined ? (
              <span
                style={{
                  fontFamily: "'Spline Sans Mono', monospace",
                  fontSize: 13,
                  color: tokens.textSoft,
                }}
              >
                {hour.waveHeightM.toFixed(1)}m @ {Math.round(hour.wavePeriodS)}s ·{' '}
                {WIND_STATE_LABEL[hour.windState]} {Math.round(hour.windSpeedKmh)}km/h{' '}
                {compassPoint(hour.windDirectionDeg)}
                {hour.seaTempC !== undefined ? ` · sea ${hour.seaTempC.toFixed(1)}°C` : ''}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <SeaBands hour={hour} verdict={verdict.verdict} colour={tokens.sea[verdict.verdict]} />
    </header>
  );
}
