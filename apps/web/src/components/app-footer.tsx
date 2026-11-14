import type { ShellLink } from '@tonnta/web-shell';
import { ShellFooter } from '@tonnta/web-shell';

import { APP_IDENTITIES, type Activity, spotPath } from '@/lib/activity';

export function AppFooter({
  activity = 'surf',
  spotId = 'donabate',
}: {
  activity?: Activity;
  spotId?: string;
}) {
  const links: ShellLink[] = [];
  if (activity === 'surf') {
    links.push({ label: 'Loga · Beach checks', href: `/log?spot=${encodeURIComponent(spotId)}` });
  }
  links.push({
    label: `Open the ${activity === 'surf' ? 'swimming' : 'surfing'} app`,
    href: spotPath(activity === 'surf' ? 'swim' : 'surf', spotId),
  });
  const identity = APP_IDENTITIES[activity];
  return (
    <ShellFooter
      links={links}
      notice={`${identity.name} · ${identity.label}. Data: Marine Institute (CC BY 4.0), Met Éireann, Open-Meteo (CC BY 4.0). Forecasts are open-water estimates; breaking waves at the beach are often smaller. Sea state is advice, not a lifeguard. Know your limits.`}
    />
  );
}
