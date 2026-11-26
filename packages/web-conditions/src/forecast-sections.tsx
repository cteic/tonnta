'use client';

import { sunTimes } from '@tonnta/data';
import type { BuoyObservation, DayFacts, Spot, TideEvent } from '@tonnta/types';
import type { ThemeTokens } from '@tonnta/web-shell';
import { useAppTheme } from '@tonnta/web-shell';

import { compassPoint, formatDayDate, formatDayName, formatHour } from './format';
import { UNKNOWN, dayFactsText } from './surf-facts';

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

export function DayStrip({ days, spot }: { days: DayFacts[]; spot: Spot }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  return (
    <section>
      <h2 style={{ ...eyebrowStyle(tokens), marginBottom: 12 }}>An tseachtain · The week ahead</h2>
      {days.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: tokens.textSubtle }}>
          Daily forecast: {UNKNOWN}
        </p>
      ) : null}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(104px, 1fr))',
          gap: 8,
        }}
      >
        {days.map((day) => {
          const text = dayFactsText(day);
          return (
            <div key={day.date} style={{ ...cardStyle(tokens), padding: 12 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: tokens.textSoft }}>
                {formatDayName(`${day.date}T12:00:00Z`, spot.timezone)}
              </p>
              <p style={{ ...MONO, margin: '2px 0 8px', fontSize: 10, color: tokens.textSubtle }}>
                {formatDayDate(`${day.date}T12:00:00Z`, spot.timezone)}
              </p>
              <DayFact label="waves" value={text.waves} />
              <DayFact label="period" value={text.period} />
              <DayFact label="wind" value={text.wind} />
              <DayFact label="gusts to" value={text.gusts} />
            </div>
          );
        })}
      </div>
      {days.length > 0 ? (
        <p style={{ ...MONO, margin: '10px 0 0', fontSize: 11, color: tokens.textSubtle }}>
          daylight hours · Open-Meteo model estimates, open water, not breaking waves at the beach
        </p>
      ) : null}
    </section>
  );
}

function DayFact({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  return (
    <p style={{ margin: '0 0 4px' }}>
      <span style={{ ...MONO, display: 'block', fontSize: 13, color: tokens.text }}>{value}</span>
      <span style={{ fontSize: 10, color: tokens.textSubtle }}>{label}</span>
    </p>
  );
}

export function SunCard({ at, spot }: { at: number; spot: Spot }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const { sunrise, sunset } = sunTimes(at, spot.latitude, spot.longitude);
  const clock = (value: number | undefined): string =>
    value === undefined ? UNKNOWN : formatHour(new Date(value).toISOString(), spot.timezone);
  return (
    <section style={cardStyle(tokens)}>
      <h2 style={eyebrowStyle(tokens)}>Grian · Sun at {spot.name}</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 12 }}>
        <Stat label="sunrise" value={clock(sunrise)} />
        <Stat label="sunset" value={clock(sunset)} />
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
      <h2 style={eyebrowStyle(tokens)}>Taoidí · Tides at {spot.tideStationId ?? spot.name}</h2>
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
              {tide.heightM.toFixed(1)}m MSL
            </span>
          </div>
        ))}
        {upcoming.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: tokens.textSubtle }}>Tide times: {UNKNOWN}</p>
        ) : null}
      </div>
      {upcoming.length > 0 ? (
        <p style={{ ...MONO, margin: '12px 0 0', fontSize: 11, color: tokens.textSubtle }}>
          heights in metres relative to mean sea level (MSL) · Marine Institute
        </p>
      ) : null}
    </section>
  );
}

export function BuoyCard({ buoy, spot }: { buoy?: BuoyObservation | undefined; spot: Spot }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const stationId = buoy?.stationId ?? spot.buoyStationId ?? 'buoy';
  const windDirection =
    buoy?.windDirectionDeg === undefined ? '' : ` ${compassPoint(buoy.windDirectionDeg)}`;
  return (
    <section style={cardStyle(tokens)}>
      <h2 style={eyebrowStyle(tokens)}>
        {buoy !== undefined ? (
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
        ) : null}
        Anois ar an mbaoi · Now at {stationId}
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginTop: 12 }}>
        <Stat
          label="waves"
          value={buoy?.waveHeightM === undefined ? UNKNOWN : `${buoy.waveHeightM.toFixed(2)}m`}
        />
        <Stat
          label="period"
          value={buoy?.wavePeriodS === undefined ? UNKNOWN : `${buoy.wavePeriodS.toFixed(1)}s`}
        />
        <Stat
          label="wind"
          value={
            buoy?.windSpeedKmh === undefined
              ? UNKNOWN
              : `${Math.round(buoy.windSpeedKmh)}km/h${windDirection}`
          }
        />
        <Stat
          label="sea temp"
          value={buoy?.seaTempC === undefined ? UNKNOWN : `${buoy.seaTempC.toFixed(1)}°C`}
        />
      </div>
      <p style={{ ...MONO, margin: '14px 0 0', fontSize: 11, color: tokens.textSubtle }}>
        {buoy !== undefined
          ? `reported ${formatDayName(buoy.time, spot.timezone)} ${formatHour(buoy.time, spot.timezone)} · `
          : 'no report loaded · '}
        Marine Institute · offshore measurement, not beach surf
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
