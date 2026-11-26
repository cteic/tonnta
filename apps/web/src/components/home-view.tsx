'use client';

import type { SpotConditions } from '@tonnta/web-conditions';
import {
  BuoyCard,
  DarkHero,
  DayStrip,
  SeaHero,
  SunCard,
  TideCard,
  Warnings,
  useLiveConditions,
} from '@tonnta/web-conditions';
import { ThemePicker, useAppTheme } from '@tonnta/web-shell';

import { AlertCard } from '@/components/alert-card';
import { SpotSwitcher } from '@/components/spot-switcher';
import { useForecastCapture } from '@/components/use-forecast-capture';
import { APP_IDENTITY } from '@/lib/spot-links';
import { CairtHero } from '@/themes/cairt/cairt-hero';
import { EiriHero } from '@/themes/eiri/eiri-hero';
import { PostaerHero } from '@/themes/postaer/postaer-hero';

interface HomeViewProps {
  conditions: SpotConditions;
}

/**
 * The surf site shows facts and lets the surfer decide. The verdict engine
 * still runs underneath to pick a board, but no verdict word, reason or
 * verdict colour reaches the page. The board shows as a plain tag.
 */
export function HomeView({ conditions: initialConditions }: HomeViewProps) {
  const conditions = useLiveConditions(initialConditions);
  const forecastCaptureFailed = useForecastCapture(initialConditions);
  const identity = APP_IDENTITY;
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const { spot } = conditions;
  // No current hour means no board: never carry a tag over from stale data.
  const board = conditions.currentHour === undefined ? undefined : conditions.now.board;
  let surfHero = <SeaHero board={board} hour={conditions.currentHour} spotName={spot.name} />;
  if (theme.hero === 'eiri') {
    surfHero = (
      <EiriHero
        board={board}
        spotName={spot.name}
        hour={conditions.currentHour}
        buoy={conditions.buoy}
        nextTide={conditions.tides[0]}
        latitude={spot.latitude}
        longitude={spot.longitude}
        timezone={spot.timezone}
      />
    );
  }
  if (theme.hero === 'cairt') {
    surfHero = (
      <CairtHero board={board} hour={conditions.currentHour} buoy={conditions.buoy} spot={spot} />
    );
  }
  if (theme.hero === 'postaer') {
    surfHero = <PostaerHero spot={spot} board={board} hour={conditions.currentHour} />;
  }

  const { headline } = conditions;
  let hero =
    headline.kind === 'dark' ? (
      <DarkHero
        spot={spot}
        mode="surf"
        sunrise={headline.sunrise}
        firstLightTime={headline.firstLight?.hour.time}
        surfHour={headline.firstLight?.hour}
      />
    ) : (
      surfHero
    );

  if (headline.kind === 'none') {
    hero = (
      <header style={{ maxWidth: 720, margin: '0 auto', padding: '24px' }}>
        <h1>Current conditions unavailable</h1>
        <p>
          Waves, wind and board for this hour: Unknown. The forecast for this hour did not load.
          Reload to check for updates.
        </p>
      </header>
    );
  }

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
              {identity.name}
              <span style={{ color: tokens.accent }}>.</span>
            </span>
            <span
              style={{
                fontFamily: "'Spline Sans Mono', monospace",
                fontSize: 12,
                color: tokens.textSoft,
              }}
            >
              {identity.label} · {spot.name} · {spot.region}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SpotSwitcher activeSpotId={spot.id} />
            <ThemePicker />
          </div>
        </nav>
      </div>

      <main>
        {hero}

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
          <section style={{ padding: 16, border: `1px solid ${tokens.border}`, borderRadius: 12 }}>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: tokens.textSoft }}>
              These are regional sea estimates, not measured breaking waves at {spot.name}. This is
              information, not advice: you decide whether to surf.{' '}
              <a href="/about" style={{ color: tokens.accent }}>
                About this information
              </a>
            </p>
            <a href={`/log?spot=${encodeURIComponent(spot.id)}`} style={{ color: tokens.accent }}>
              Been to the beach? Add a quick check
            </a>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: tokens.textSubtle }}>
              Save what you saw and whether it was good enough for you. Private on this device. No
              automatic forecast changes.
            </p>
            {forecastCaptureFailed ? (
              <p role="status" style={{ margin: '8px 0 0', fontSize: 12, color: tokens.textSoft }}>
                This device could not save the forecast comparison. You can still record a beach
                check without a matching forecast.
              </p>
            ) : null}
          </section>
          <DayStrip days={conditions.dayFacts} spot={spot} />
          {conditions.buoy !== undefined || spot.buoyStationId !== undefined ? (
            <BuoyCard buoy={conditions.buoy} spot={spot} />
          ) : null}
          <TideCard tides={conditions.tides} spot={spot} />
          <SunCard at={conditions.loadedAt} spot={spot} />
          <AlertCard spotId={spot.id} />
        </div>
      </main>
    </>
  );
}
