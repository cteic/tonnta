'use client';

import type { SpotConditions } from '@tonnta/web-conditions';
import {
  BuoyCard,
  DarkHero,
  SnamhHero,
  SwimWindowsCard,
  TideCard,
  Warnings,
  useLiveConditions,
} from '@tonnta/web-conditions';
import { ThemePicker, useAppTheme } from '@tonnta/web-shell';

import { SITE_LABEL, SITE_NAME } from '@/lib/site';

import { SpotSwitcher } from './spot-switcher';

function SwimHero({ conditions }: { conditions: SpotConditions }) {
  const { headline, spot } = conditions;
  if (headline.kind === 'none') {
    return (
      <header style={{ maxWidth: 720, margin: '0 auto', padding: '24px' }}>
        <h1>Current conditions unavailable</h1>
        <p>
          We do not have a forecast for this hour. Reload to check for updates and check local
          advice before entering the water.
        </p>
      </header>
    );
  }
  if (headline.kind === 'dark') {
    return (
      <DarkHero
        spot={spot}
        mode="snamh"
        sunrise={headline.sunrise}
        firstLightTime={headline.firstLight?.hour.time}
        swim={conditions.swimFirstLight}
      />
    );
  }
  return (
    <SnamhHero
      swim={conditions.swimNow}
      hour={conditions.currentHour}
      waterQuality={conditions.waterQuality}
    />
  );
}

export function SwimView({ conditions: initialConditions }: { conditions: SpotConditions }) {
  const conditions = useLiveConditions(initialConditions);
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const { spot } = conditions;
  const restricted = conditions.waterQuality?.restrictionInPlace === true;

  return (
    <>
      <div style={{ background: tokens.nav }}>
        <nav
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '28px 24px 16px',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              {SITE_LABEL} · {spot.name} · {spot.region}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SpotSwitcher activeSpotId={spot.id} />
            <ThemePicker />
          </div>
        </nav>
      </div>

      <main>
        <SwimHero conditions={conditions} />
        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            padding: '28px 24px 8px',
            display: 'grid',
            gap: 16,
          }}
        >
          <Warnings warnings={conditions.warnings} />
          {restricted ? (
            <p>
              Swim windows are unavailable while a bathing restriction is in place. Follow the
              current local notice.
            </p>
          ) : (
            <SwimWindowsCard windows={conditions.swimWindows} spot={spot} />
          )}
          {conditions.buoy !== undefined ? <BuoyCard buoy={conditions.buoy} spot={spot} /> : null}
          <TideCard tides={conditions.tides} spot={spot} />
        </div>
      </main>
    </>
  );
}
