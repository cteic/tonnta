'use client';

import { isWaterQualityUnknown, waterQualityMessage } from '@tonnta/data';
import type { SwimWindow } from '@tonnta/data';
import type { Spot, WaterQualityStatus } from '@tonnta/types';
import type { ThemeTokens } from '@tonnta/web-shell';
import { useAppTheme } from '@tonnta/web-shell';

import { formatDayName, formatHour, formatHourRange } from './format';

function cardStyle(tokens: ThemeTokens): React.CSSProperties {
  return {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 16,
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

export function SwimWindowsCard({
  windows,
  spot,
  waterQualityStatus = 'unchecked',
}: {
  windows: SwimWindow[];
  spot: Spot;
  waterQualityStatus?: WaterQualityStatus | undefined;
}) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const withheld = isWaterQualityUnknown(waterQualityStatus) || waterQualityStatus === 'restricted';
  return (
    <section style={{ ...cardStyle(tokens), borderColor: 'rgba(143,193,181,0.4)' }}>
      <h2 style={eyebrowStyle(tokens)}>Fuinneoga · Weather windows</h2>
      {withheld && (
        <p style={{ margin: '10px 0 0', fontSize: 14, color: tokens.textMuted }}>
          {waterQualityMessage(waterQualityStatus)} No swimming recommendation is being made.
        </p>
      )}
      {!withheld && windows.length === 0 && (
        <p style={{ margin: '10px 0 0', fontSize: 14, color: tokens.textMuted }}>
          No swim windows are available from the current forecast. Check forecast availability and
          current local bathing advice.
        </p>
      )}
      {!withheld && windows.length > 0 && (
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          {windows.map((window) => {
            const first = window.hours[0];
            return (
              <div key={window.start} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span
                  style={{
                    fontFamily: "'Clash Display', sans-serif",
                    fontWeight: 600,
                    fontSize: 18,
                    color: window.nearHighTide ? tokens.positive : tokens.text,
                    minWidth: 150,
                  }}
                >
                  {formatDayName(window.start, spot.timezone)}{' '}
                  {formatHourRange(window.start, window.end, spot.timezone)}
                </span>
                <span style={{ ...MONO, fontSize: 12, color: tokens.textSoft }}>
                  {window.highTide !== undefined
                    ? `around high tide, ${formatHour(window.highTide, spot.timezone)}`
                    : 'low water, a long walk out'}
                  {first?.seaTempC !== undefined ? ` · ${first.seaTempC.toFixed(1)}°C` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ margin: '12px 0 0', fontSize: 12, color: tokens.textSubtle }}>
        These windows describe modeled weather, not future water quality. Check current local
        notices before each visit.
      </p>
    </section>
  );
}
