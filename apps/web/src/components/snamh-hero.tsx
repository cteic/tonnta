'use client';

import type { HourlyConditions, SwimVerdictResult, WaterQualityAlert } from '@tonnta/types';

import { WIND_STATE_LABEL, compassPoint } from '@/lib/format';
import { useAppTheme } from '@/themes/theme-context';

import { SeaBands } from './sea-hero';

/**
 * The Snámh hero — the same living sea, read the other way around. Calm
 * pale water is the GOOD outcome here, so swim verdicts map to the calm end
 * of the sea-state ladder.
 */

const SWIM_LABEL: Record<string, { english: string; irish: string }> = {
  great: { english: 'PERFECT', irish: 'Foirfe' },
  ok: { english: 'GRAND', irish: 'Ceart go leor' },
  no: { english: 'NOT TODAY', irish: 'Ná téigh' },
};

function resolveSwimSea(verdict: string): 'go' | 'maybe' | 'flat' | 'blown' {
  if (verdict === 'great') return 'flat';
  if (verdict === 'ok') return 'go';
  return 'blown';
}

/** Swim verdict → SeaBands colour verdict: calm reads positive. */
const SWIM_SEA_VERDICT: Record<string, string> = {
  great: 'flat',
  ok: 'go',
  no: 'blown',
};

interface SnamhHeroProps {
  swim: SwimVerdictResult;
  hour?: HourlyConditions | undefined;
  waterQuality?: WaterQualityAlert | undefined;
}

export function SnamhHero({ swim, hour, waterQuality }: SnamhHeroProps) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const label = SWIM_LABEL[swim.verdict] ?? SWIM_LABEL.no;
  const isGreat = swim.verdict === 'great';
  const restricted = waterQuality?.restrictionInPlace === true;

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
              color: isGreat ? tokens.accent : tokens.textSoft,
            }}
          >
            {label?.irish}
          </p>
          <h1
            style={{
              margin: '2px 0 10px',
              fontFamily: "'Clash Display', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(48px, 12vw, 88px)',
              lineHeight: 0.98,
              letterSpacing: '-0.02em',
              color: isGreat ? tokens.accent : tokens.text,
            }}
          >
            <span className="tonnta-visually-hidden">Donabate swimming today — </span>
            {label?.english}
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
            {swim.reason}
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              gap: 16,
              marginTop: 22,
            }}
          >
            {hour?.seaTempC !== undefined ? (
              <span
                style={{
                  fontFamily: "'Clash Display', sans-serif",
                  fontWeight: 600,
                  fontSize: 44,
                  letterSpacing: -1,
                  color: tokens.text,
                }}
              >
                {hour.seaTempC.toFixed(1)}
                <span style={{ fontSize: 20, color: tokens.textSoft }}>°C sea</span>
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
                {hour.waveHeightM.toFixed(1)}m sea · {WIND_STATE_LABEL[hour.windState]}{' '}
                {Math.round(hour.windSpeedKmh)}km/h {compassPoint(hour.windDirectionDeg)}
                {swim.nearHighTide ? ' · gar do lán mara — near high tide' : ''}
              </span>
            ) : null}
          </div>

          {restricted ? (
            <p
              role="alert"
              style={{
                margin: '18px 0 0',
                padding: '10px 14px',
                maxWidth: 440,
                borderRadius: 12,
                border: '1px solid rgba(196,85,59,0.6)',
                background: tokens.dangerBg,
                fontSize: 13,
                lineHeight: 1.5,
                color: tokens.text,
              }}
            >
              Bathing restriction in place at {waterQuality?.beachName} — EPA notice
              {waterQuality?.startDate !== undefined ? ` since ${waterQuality.startDate}` : ''}.
            </p>
          ) : null}
        </div>
      </div>

      <SeaBands
        hour={hour}
        verdict={SWIM_SEA_VERDICT[swim.verdict] ?? 'blown'}
        colour={tokens.sea[resolveSwimSea(swim.verdict)]}
      />
    </header>
  );
}
