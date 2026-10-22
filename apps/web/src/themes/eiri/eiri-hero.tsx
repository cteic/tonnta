'use client';

import { useEffect, useState } from 'react';

import type { BuoyObservation, HourlyConditions, TideEvent, VerdictResult } from '@tonnta/types';

import { SeaBands } from '@/components/sea-hero';
import {
  BOARD_LABEL,
  VERDICT_LABEL,
  WIND_STATE_LABEL,
  compassPoint,
  formatHour,
} from '@/lib/format';
import { useAppTheme } from '@/themes/theme-context';

import type { SolarScene } from './solar';
import { skyGradient, solarScene } from './solar';

/** Chip-sized wind-state labels — the full ones wrap the glass row. */
const SHORT_WIND: Record<string, string> = {
  offshore: 'off',
  'cross-off': 'x-off',
  'cross-shore': 'cross',
  'cross-on': 'x-on',
  onshore: 'on',
  glassy: 'glassy',
};

/**
 * Éirí — the dawn window. The hero paints the sky for this minute at the
 * spot: real solar altitude drives the gradient, the disc and the glow.
 * The verdict floats above the horizon; the living sea bands roll below it,
 * tinted by the current light. Chrome dissolves; the sea does the talking.
 */

interface EiriHeroProps {
  verdict: VerdictResult;
  hour?: HourlyConditions | undefined;
  buoy?: BuoyObservation | undefined;
  nextTide?: TideEvent | undefined;
  latitude: number;
  longitude: number;
  timezone: string;
}

function useScene(latitude: number, longitude: number): SolarScene {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return solarScene(now, latitude, longitude);
}

function GlassChip({ value, label, scene }: { value: string; label: string; scene: SolarScene }) {
  const dark = scene.phase === 'day';
  return (
    <div
      style={{
        flex: 1,
        minWidth: 72,
        textAlign: 'center',
        padding: '10px 6px 9px',
        borderRadius: 14,
        background: dark ? 'rgba(240, 246, 244, 0.5)' : 'rgba(10, 28, 33, 0.42)',
        border: `1px solid ${dark ? 'rgba(15, 34, 41, 0.2)' : 'rgba(214, 228, 224, 0.16)'}`,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <b
        style={{
          display: 'block',
          fontFamily: "'Clash Display', sans-serif",
          fontWeight: 600,
          fontSize: 19,
          color: scene.text,
        }}
      >
        {value}
      </b>
      <span
        style={{
          fontSize: 9.5,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: scene.textMuted,
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function EiriHero({
  verdict,
  hour,
  buoy,
  nextTide,
  latitude,
  longitude,
  timezone,
}: EiriHeroProps) {
  const { theme } = useAppTheme();
  const scene = useScene(latitude, longitude);
  const label = VERDICT_LABEL[verdict.verdict];
  const isGo = verdict.verdict === 'go';
  const seaColour = theme.tokens.sea[verdict.verdict];

  return (
    <header
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: skyGradient(scene),
        paddingBottom: 190,
      }}
    >
      {/* horizon line + glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '69%',
          height: 1,
          background: 'rgba(255, 236, 200, 0.9)',
          boxShadow: `0 0 ${18 + scene.glow * 26}px ${2 + scene.glow * 6}px rgba(232, 163, 61, ${
            0.15 + scene.glow * 0.45
          })`,
          opacity: 0.35 + scene.glow * 0.65,
        }}
      />
      {/* sun / moon */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: scene.phase === 'day' ? '76%' : '50%',
          top: `calc(69% - ${6 + Math.min(150, scene.discAltitude01 * 260)}px)`,
          width: scene.disc === 'sun' ? 46 : 30,
          height: scene.disc === 'sun' ? 46 : 30,
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          background: scene.disc === 'sun' ? '#FFE3AD' : '#E9EDF2',
          filter: 'blur(0.5px)',
          boxShadow:
            scene.disc === 'sun'
              ? `0 0 ${24 + scene.glow * 30}px ${6 + scene.glow * 8}px rgba(255, 210, 140, ${
                  0.3 + scene.glow * 0.4
                })`
              : '0 0 18px 4px rgba(220, 228, 240, 0.35)',
          opacity: scene.phase === 'day' ? 0.55 : 1,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 720,
          margin: '0 auto',
          padding: '30px 24px 0',
        }}
      >
        <div className="tonnta-surface-in" style={{ textAlign: 'center', marginTop: 26 }}>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: isGo ? '#FFE0AA' : scene.textMuted,
            }}
          >
            {label.irish}
          </p>
          <h1
            style={{
              margin: '2px 0 0',
              fontFamily: "'Clash Display', sans-serif",
              fontWeight: 600,
              fontSize: 'clamp(60px, 16vw, 104px)',
              lineHeight: 1,
              letterSpacing: '-0.015em',
              color: scene.text,
              textShadow: isGo ? `0 0 60px rgba(232, 163, 61, ${0.2 + scene.glow * 0.25})` : 'none',
            }}
          >
            <span className="tonnta-visually-hidden">Donabate surf today — </span>
            {label.english}
          </h1>
          <p
            style={{
              margin: '10px auto 0',
              maxWidth: '32ch',
              fontSize: 15,
              lineHeight: 1.5,
              color: scene.textMuted,
            }}
          >
            {verdict.reason}
          </p>
          {verdict.board !== undefined ? (
            <p style={{ margin: '16px 0 0' }}>
              <em
                style={{
                  fontStyle: 'normal',
                  background: theme.tokens.accent,
                  color: theme.tokens.accentContrast,
                  fontFamily: "'Clash Display', sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  padding: '8px 18px',
                  borderRadius: 999,
                }}
              >
                {BOARD_LABEL[verdict.board]} day
              </em>
            </p>
          ) : null}
        </div>

        <div style={{ marginTop: 118 }}>
          {hour !== undefined ? (
            <p
              style={{
                margin: '0 0 12px',
                textAlign: 'center',
                fontFamily: "'Spline Sans Mono', monospace",
                fontSize: 11,
                letterSpacing: '0.06em',
                color: scene.textMuted,
              }}
            >
              {WIND_STATE_LABEL[hour.windState]} {Math.round(hour.windSpeedKmh)}km/h{' '}
              {compassPoint(hour.windDirectionDeg)}
              {hour.seaTempC !== undefined ? ` · sea ${hour.seaTempC.toFixed(1)}°C` : ''}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: 8 }}>
            {hour !== undefined ? (
              <GlassChip
                value={`${hour.waveHeightM.toFixed(1)}m`}
                label={`@ ${Math.round(hour.wavePeriodS)}s`}
                scene={scene}
              />
            ) : null}
            {hour !== undefined ? (
              <GlassChip
                value={`${Math.round(hour.windSpeedKmh)}`}
                label={`km/h ${SHORT_WIND[WIND_STATE_LABEL[hour.windState] ?? ''] ?? hour.windState}`}
                scene={scene}
              />
            ) : null}
            {buoy?.waveHeightM !== undefined ? (
              <GlassChip
                value={buoy.waveHeightM.toFixed(2)}
                label={`${buoy.stationId} live`}
                scene={scene}
              />
            ) : null}
            {nextTide !== undefined ? (
              <GlassChip
                value={formatHour(nextTide.time, timezone)}
                label={`${nextTide.kind} tide`}
                scene={scene}
              />
            ) : null}
          </div>
        </div>
      </div>

      <SeaBands hour={hour} verdict={verdict.verdict} colour={seaColour} />
    </header>
  );
}
