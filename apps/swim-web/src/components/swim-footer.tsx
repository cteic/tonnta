import { ShellFooter } from '@tonnta/web-shell';

import { SITE_NAME, SURF_ORIGIN } from '@/lib/site';

export const FOOTER_NOTICE = `${SITE_NAME} lists facts, not advice. Bathing water data: EPA (CC BY 4.0). Weather and sea values: Open-Meteo (CC BY 4.0), model estimates, not measurements. Water Safety Ireland advises swimming at lifeguarded waters, between the red and yellow flags. In an emergency call 112 or 999 and ask for the Coast Guard.`;

export function SwimFooter() {
  return (
    <ShellFooter
      links={[
        { label: 'EPA bathing water notices on beaches.ie', href: 'https://www.beaches.ie/' },
        { label: 'Water Safety Ireland', href: 'https://watersafety.ie/' },
        { label: 'Surf conditions on Tonnta', href: SURF_ORIGIN },
      ]}
      notice={FOOTER_NOTICE}
    />
  );
}
