'use client';

import { ThemePicker, useAppTheme } from '@tonnta/web-shell';

import { SITE_LABEL, SITE_NAME } from '@/lib/site';

interface SwimHeaderProps {
  /** Shown under the name, for example the beach and county. */
  context?: string;
}

export function SwimHeader({ context }: SwimHeaderProps) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  return (
    <div style={{ background: tokens.nav }}>
      <nav
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '28px 16px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <a href="/" style={{ color: 'inherit', textDecoration: 'none' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontFamily: "'Clash Display', sans-serif",
                fontWeight: 600,
                fontSize: 22,
                letterSpacing: -0.5,
              }}
            >
              {SITE_NAME}
              <span style={{ color: tokens.accent }}>.</span>
            </span>
            <span
              style={{
                fontFamily: "'Spline Sans Mono', monospace",
                fontSize: 12,
                color: tokens.textSoft,
              }}
            >
              {context === undefined ? SITE_LABEL : `${SITE_LABEL} · ${context}`}
            </span>
          </span>
        </a>
        <ThemePicker />
      </nav>
    </div>
  );
}
