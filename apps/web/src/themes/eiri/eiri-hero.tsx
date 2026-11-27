'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import type { Board, BuoyObservation, HourlyConditions, TideEvent } from '@tonnta/types';
import { SeaBands, SeaStateLabel } from '@tonnta/web-conditions';
import { WIND_STATE_LABEL, boardTag, formatHour, surfHourFacts } from '@tonnta/web-conditions';
import { useAppTheme } from '@tonnta/web-shell';

import type { SolarScene } from './solar';
import { discLiftPx, skyAboveHorizon, solarScene } from './solar';

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
 * The wave height floats above the horizon; the living sea bands roll below it,
 * tinted by the current light. Chrome dissolves; the sea does the talking.
 * After dark the same sky and moon sit behind the night screen's words.
 */

interface EiriHeroProps {
  /** The board the engine picked for this hour, shown as a plain tag. */
  board?: Board | undefined;
  spotName: string;
  hour?: HourlyConditions | undefined;
  buoy?: BuoyObservation | undefined;
  nextTide?: TideEvent | undefined;
  latitude: number;
  longitude: number;
  timezone: string;
  /** After dark: the night screen's words, drawn on this sky in place of the facts. */
  night?: ReactNode | undefined;
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
  board,
  spotName,
  hour,
  buoy,
  nextTide,
  latitude,
  longitude,
  timezone,
  night,
}: EiriHeroProps) {
  const { theme } = useAppTheme();
  const scene = useScene(latitude, longitude);
  const facts = surfHourFacts(hour);
  const tag = boardTag(board);
  // One sea colour whatever the forecast: the bands show the sea, not a judgement.
  const seaColour = theme.tokens.sea.maybe;

  return (
    <header
      data-testid={night === undefined ? 'eiri-hero' : 'dark-hero'}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: scene.water,
        paddingBottom: 'clamp(96px, 34vw, 190px)',
      }}
    >
      {/* sky: ends at the horizon, so a low sun or moon sits clear of the stat chips */}
      <div style={{ position: 'relative', background: skyAboveHorizon(scene) }}>
        {/* sun / moon */}
        <div
          aria-hidden
          data-testid="eiri-disc"
          data-disc={scene.disc}
          style={{
            position: 'absolute',
            left: scene.phase === 'day' ? '76%' : '50%',
            bottom: discLiftPx(scene),
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
        {/* horizon line + glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 1,
            zIndex: 1,
            background: 'rgba(255, 236, 200, 0.9)',
            boxShadow: `0 0 ${18 + scene.glow * 26}px ${2 + scene.glow * 6}px rgba(232, 163, 61, ${
              0.15 + scene.glow * 0.45
            })`,
            opacity: 0.35 + scene.glow * 0.65,
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: 720,
            margin: '0 auto',
            padding: '30px 24px clamp(72px, 24vw, 118px)',
          }}
        >
          {night !== undefined ? (
            <div className="tonnta-surface-in" style={{ marginTop: 26 }}>
              {night}
            </div>
          ) : (
            <div className="tonnta-surface-in" style={{ textAlign: 'center', marginTop: 26 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: '#FFE0AA',
                }}
              >
                Tonnta · Waves now
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
                  textShadow: `0 0 60px rgba(232, 163, 61, ${(0.2 + scene.glow * 0.25).toFixed(2)})`,
                }}
              >
                <span className="tonnta-visually-hidden">{spotName} surf conditions: waves </span>
                {facts.waveHeight}
              </h1>
              <SeaStateLabel
                hour={hour}
                wordStyle={{
                  margin: '6px 0 0',
                  fontFamily: "'Clash Display', sans-serif",
                  fontWeight: 600,
                  fontSize: 'clamp(24px, 7vw, 32px)',
                  lineHeight: 1.1,
                  color: scene.text,
                }}
                ruleStyle={{
                  marginTop: 2,
                  fontFamily: "'Spline Sans Mono', monospace",
                  fontWeight: 400,
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  color: scene.textMuted,
                }}
              />
              <p
                style={{
                  margin: '10px auto 0',
                  maxWidth: '32ch',
                  fontFamily: "'Spline Sans Mono', monospace",
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: scene.textMuted,
                }}
              >
                period {facts.wavePeriod} · gusts {facts.windGust} · sea {facts.seaTemp}
              </p>
              {tag !== undefined ? (
                <p style={{ margin: '16px 0 0', fontSize: 12, color: scene.textMuted }}>
                  Board{' '}
                  <em
                    style={{
                      fontStyle: 'normal',
                      marginLeft: 6,
                      background: theme.tokens.accent,
                      color: theme.tokens.accentContrast,
                      fontFamily: "'Clash Display', sans-serif",
                      fontWeight: 600,
                      fontSize: 14,
                      padding: '8px 18px',
                      borderRadius: 999,
                    }}
                  >
                    {tag}
                  </em>
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {night !== undefined ? null : (
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: 720,
            margin: '0 auto',
            padding: '14px 24px 0',
          }}
        >
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
              wind {facts.windSpeed} {facts.windDirection} · {facts.windState}
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
      )}

      <SeaBands hour={hour} colour={seaColour} />
    </header>
  );
}
