import { ShellFooter } from '@tonnta/web-shell';

import { APP_IDENTITY, swimSpotUrl } from '@/lib/spot-links';

export function AppFooter({ spotId = 'donabate' }: { spotId?: string }) {
  return (
    <ShellFooter
      links={[
        { label: 'Loga · Beach checks', href: `/log?spot=${encodeURIComponent(spotId)}` },
        { label: 'Swimming conditions on Snámh', href: swimSpotUrl(spotId) },
      ]}
      notice={`${APP_IDENTITY.name} · ${APP_IDENTITY.label}. Data: Marine Institute (CC BY 4.0), Met Éireann, Open-Meteo (CC BY 4.0). Forecasts are open-water estimates; breaking waves at the beach are often smaller. Sea state is advice, not a lifeguard. Know your limits.`}
    />
  );
}
