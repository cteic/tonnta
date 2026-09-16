'use client';

import type { GoodWindow } from '@tonnta/data';
import type { BuoyObservation, DailySummary, Spot, TideEvent } from '@tonnta/types';

import {
  BOARD_LABEL,
  VERDICT_LABEL,
  WIND_STATE_LABEL,
  compassPoint,
  formatDayDate,
  formatDayName,
  formatHour,
  formatWindowRange,
} from '@/lib/format';
import type { ThemeTokens } from '@/themes/registry';
import { useAppTheme } from '@/themes/theme-context';

function cardStyle(tokens: ThemeTokens): React.CSSProperties {
  return {
    background: tokens.surface,
    border: `${tokens.cardBorderPx ?? 1}px solid ${tokens.border}`,
    borderRadius: tokens.cardRadiusPx ?? 16,
    padding: 20,
  };
}

function eyebrowStyle(tokens: ThemeTokens): React.CSSProperties {
  return {
    margin: 0,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: tokens.textSubtle,
  };
}

const MONO: React.CSSProperties = {
  fontFamily: "'Spline Sans Mono', monospace",
};

export function NextWindowCard({ window, spot }: { window: GoodWindow; spot: Spot }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const first = window.hours[0];
  return (
    <section style={{ ...cardStyle(tokens), borderColor: tokens.accentBorder }}>
      <p style={eyebrowStyle(tokens)}>An chéad fhuinneog · Next good window</p>
      <p
        style={{
          margin: '8px 0 4px',
          fontFamily: "'Clash Display', sans-serif",
          fontWeight: 600,
          fontSize: 24,
          color: tokens.accent,
        }}
      >
        {formatDayName(window.start, spot.timezone)}{' '}
        {formatWindowRange(window.start, window.end, spot.timezone)}
      </p>
      {first !== undefined ? (
        <p style={{ ...MONO, margin: 0, fontSize: 13, color: tokens.textSoft }}>
          {first.waveHeightM.toFixed(1)}m · {WIND_STATE_LABEL[first.windState]}{' '}
          {Math.round(first.windSpeedKmh)}km/h
          {window.board !== undefined ? ` · bring the ${BOARD_LABEL[window.board]}` : ''}
        </p>
      ) : null}
    </section>
  );
}

export function DayStrip({ days, spot }: { days: DailySummary[]; spot: Spot }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  return (
    <section>
      <p style={{ ...eyebrowStyle(tokens), marginBottom: 12 }}>An tseachtain · The week ahead</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))',
          gap: 8,
        }}
      >
        {days.map((day) => {
          const swatch = tokens.sea[day.verdict];
          const isGo = day.verdict === 'go';
          return (
            <div
              key={day.date}
              style={{
                ...cardStyle(tokens),
                padding: 12,
                textAlign: 'center',
                borderColor: isGo ? tokens.accentBorder : tokens.border,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: tokens.textSoft }}>
                {formatDayName(`${day.date}T12:00:00Z`, spot.timezone)}
              </p>
              <p style={{ ...MONO, margin: '2px 0 8px', fontSize: 10, color: tokens.textSubtle }}>
                {formatDayDate(`${day.date}T12:00:00Z`, spot.timezone)}
              </p>
              <div
                aria-hidden
                style={{
                  height: 34,
                  borderRadius: 8,
                  background: `linear-gradient(180deg, transparent 30%, ${swatch} 130%)`,
                  border: `1px solid ${swatch}55`,
                  marginBottom: 8,
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontFamily: "'Clash Display', sans-serif",
                  fontWeight: 600,
                  fontSize: 18,
                  color: isGo ? tokens.accent : tokens.text,
                }}
              >
                {day.maxWaveHeightM.toFixed(1)}m
              </p>
              <p style={{ margin: 0, fontSize: 11, color: tokens.textSubtle }}>
                {VERDICT_LABEL[day.verdict].english.toLowerCase()}
                {day.bestWindow !== undefined
                  ? ` · ${formatHour(day.bestWindow.start, spot.timezone)}`
                  : ''}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function TideCard({ tides, spot }: { tides: TideEvent[]; spot: Spot }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const upcoming = tides.slice(0, 4);
  return (
    <section style={cardStyle(tokens)}>
      <p style={eyebrowStyle(tokens)}>Taoidí · Tides at {spot.tideStationId}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
        {upcoming.map((tide) => (
          <div key={tide.time} style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: tide.kind === 'high' ? tokens.positive : tokens.textSubtle,
                width: 36,
              }}
            >
              {tide.kind}
            </span>
            <span style={{ ...MONO, fontSize: 15, color: tokens.text }}>
              {formatDayName(tide.time, spot.timezone)} {formatHour(tide.time, spot.timezone)}
            </span>
            <span style={{ ...MONO, fontSize: 11, color: tokens.textSubtle }}>
              {tide.heightM.toFixed(1)}m
            </span>
          </div>
        ))}
        {upcoming.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: tokens.textSubtle }}>
            Tide times are unavailable right now.
          </p>
        ) : null}
      </div>
      {upcoming.length > 0 ? (
        <p style={{ ...MONO, margin: '12px 0 0', fontSize: 11, color: tokens.textSubtle }}>
          heights vs mean sea level · Marine Institute
        </p>
      ) : null}
    </section>
  );
}

export function BuoyCard({ buoy, spot }: { buoy: BuoyObservation; spot: Spot }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  return (
    <section style={cardStyle(tokens)}>
      <p style={eyebrowStyle(tokens)}>
        <span
          data-tonnta-animated
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: 999,
            background: tokens.positive,
            marginRight: 8,
            animation: 'tonntaPulse 1.6s ease-in-out infinite',
          }}
        />
        Anois ar an mbaoi · Now at {buoy.stationId}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 12 }}>
        {buoy.waveHeightM !== undefined ? (
          <Stat label="waves" value={`${buoy.waveHeightM.toFixed(2)}m`} />
        ) : null}
        {buoy.wavePeriodS !== undefined ? (
          <Stat label="period" value={`${buoy.wavePeriodS.toFixed(1)}s`} />
        ) : null}
        {buoy.windSpeedKmh !== undefined ? (
          <Stat
            label="wind"
            value={`${Math.round(buoy.windSpeedKmh)}km/h${
              buoy.windDirectionDeg !== undefined ? ` ${compassPoint(buoy.windDirectionDeg)}` : ''
            }`}
          />
        ) : null}
        {buoy.seaTempC !== undefined ? (
          <Stat label="sea temp" value={`${buoy.seaTempC.toFixed(1)}°C`} />
        ) : null}
      </div>
      <p style={{ ...MONO, margin: '14px 0 0', fontSize: 11, color: tokens.textSubtle }}>
        reported {formatDayName(buoy.time, spot.timezone)} {formatHour(buoy.time, spot.timezone)} ·
        Marine Institute
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  return (
    <div>
      <p style={{ ...MONO, margin: 0, fontSize: 20, fontWeight: 500, color: tokens.text }}>
        {value}
      </p>
      <p style={{ margin: 0, fontSize: 11, color: tokens.textSubtle }}>{label}</p>
    </div>
  );
}

export function Warnings({ warnings }: { warnings: string[] }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  if (warnings.length === 0) return null;
  return (
    <div
      role="status"
      style={{
        ...cardStyle(tokens),
        borderColor: tokens.dangerBorder,
        padding: '12px 16px',
      }}
    >
      {warnings.map((warning) => (
        <p key={warning} style={{ margin: 0, fontSize: 13, color: tokens.textMuted }}>
          {warning}
        </p>
      ))}
    </div>
  );
}
