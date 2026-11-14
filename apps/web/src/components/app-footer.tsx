'use client';

import { APP_IDENTITIES, type Activity, spotPath } from '@/lib/activity';
import { useAppTheme } from '@/themes/theme-context';

export function AppFooter({
  activity = 'surf',
  spotId = 'donabate',
}: {
  activity?: Activity;
  spotId?: string;
}) {
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
      {activity === 'surf' ? (
        <p style={{ margin: '0 0 10px', fontSize: 13 }}>
          <a href={`/log?spot=${encodeURIComponent(spotId)}`} style={{ color: tokens.textSoft }}>
            Loga · Beach checks
          </a>
        </p>
      ) : null}
      <p style={{ margin: '0 0 10px', fontSize: 13 }}>
        <a
          href={spotPath(activity === 'surf' ? 'swim' : 'surf', spotId)}
          style={{ color: tokens.textSoft }}
        >
          Open the {activity === 'surf' ? 'swimming' : 'surfing'} app
        </a>
      </p>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: tokens.textSubtle }}>
        {APP_IDENTITIES[activity].name} · {APP_IDENTITIES[activity].label}. Data: Marine Institute
        (CC BY 4.0), Met Éireann, Open-Meteo (CC BY 4.0). Forecasts are open-water estimates;
        breaking waves at the beach are often smaller. Sea state is advice, not a lifeguard. Know
        your limits.
      </p>
    </footer>
  );
}
