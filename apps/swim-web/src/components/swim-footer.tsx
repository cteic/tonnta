import { ShellFooter } from '@tonnta/web-shell';

import { SITE_LABEL, SITE_NAME, surfSpotUrl } from '@/lib/site';

export function SwimFooter({ spotId }: { spotId: string }) {
  return (
    <ShellFooter
      links={[{ label: 'Surf conditions on Tonnta', href: surfSpotUrl(spotId) }]}
      notice={`${SITE_NAME} · ${SITE_LABEL}. Data: Marine Institute (CC BY 4.0), Met Éireann, Open-Meteo (CC BY 4.0), EPA bathing water notices. Forecasts are open-water estimates. Conditions are advice, not a lifeguard. Check local notices and know your limits.`}
    />
  );
}
