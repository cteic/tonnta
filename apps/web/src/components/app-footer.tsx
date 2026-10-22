'use client';

import { useAppTheme } from '@/themes/theme-context';

export function AppFooter() {
  const { theme } = useAppTheme();
  const { tokens } = theme;

  return (
    <footer
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '32px 24px 40px',
        borderTop: `1px solid ${tokens.border}`,
      }}
    >
      <p style={{ margin: '0 0 10px', fontSize: 13 }}>
        <a href="/log" style={{ color: tokens.textSoft }}>
          Loga · Session log
        </a>
      </p>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: tokens.textSubtle }}>
        Tonnta — <em>waves</em>, as Gaeilge. Data: Marine Institute (CC BY 4.0), Met Éireann,
        Open-Meteo (CC BY 4.0). Forecasts are open-water estimates; breaking waves at the beach are
        often smaller. Sea state is advice, not a lifeguard — know your limits.
      </p>
    </footer>
  );
}
