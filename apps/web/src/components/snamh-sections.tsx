'use client';

import type { SwimWindow } from '@tonnta/data';
import type { Spot } from '@tonnta/types';

import { formatDayName, formatHour } from '@/lib/format';
import type { ThemeTokens } from '@/themes/registry';
import { useAppTheme } from '@/themes/theme-context';

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

export function SwimWindowsCard({ windows, spot }: { windows: SwimWindow[]; spot: Spot }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  return (
    <section style={{ ...cardStyle(tokens), borderColor: 'rgba(143,193,181,0.4)' }}>
      <h2 style={eyebrowStyle(tokens)}>Fuinneoga snámha · Swim windows</h2>
      {windows.length === 0 ? (
        <p style={{ margin: '10px 0 0', fontSize: 14, color: tokens.textMuted }}>
          No swimmable windows in the next few days — the sea needs to settle first.
        </p>
      ) : (
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
                  {formatHour(window.start, spot.timezone)}–{formatHour(window.end, spot.timezone)}
                </span>
                <span style={{ ...MONO, fontSize: 12, color: tokens.textSoft }}>
                  {window.nearHighTide ? 'near high tide' : 'low-ish tide — long walk out'}
                  {first?.seaTempC !== undefined ? ` · ${first.seaTempC.toFixed(1)}°C` : ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
