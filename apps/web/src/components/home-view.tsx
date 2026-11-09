'use client';

import { DarkHero } from '@tonnta/web-conditions';
import { BuoyCard, DayStrip, NextWindowCard, TideCard, Warnings } from '@tonnta/web-conditions';
import { SeaHero } from '@tonnta/web-conditions';
import { SnamhHero } from '@tonnta/web-conditions';
import { SwimWindowsCard } from '@tonnta/web-conditions';
import { useLiveConditions } from '@tonnta/web-conditions';
import type { SpotConditions } from '@tonnta/web-conditions';
import { ThemePicker } from '@tonnta/web-shell';
import { useAppTheme } from '@tonnta/web-shell';

import { AlertCard } from '@/components/alert-card';
import { SpotSwitcher } from '@/components/spot-switcher';
import { useForecastCapture } from '@/components/use-forecast-capture';
import { APP_IDENTITIES, type Activity } from '@/lib/activity';
import { CairtHero } from '@/themes/cairt/cairt-hero';
import { EiriHero } from '@/themes/eiri/eiri-hero';
import { PostaerHero } from '@/themes/postaer/postaer-hero';

/** The URL owns the activity; device preferences never change a shared forecast. */
export function HomeView({
  conditions: initialConditions,
  activity = 'surf',
}: {
  conditions: SpotConditions;
  activity?: Activity;
}) {
  const conditions = useLiveConditions(initialConditions);
  const forecastCaptureFailed = useForecastCapture(initialConditions, activity);
  const mode = activity === 'swim' ? 'snamh' : 'surf';
  const identity = APP_IDENTITIES[activity];
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const { spot } = conditions;
  let surfHero = <SeaHero verdict={conditions.now} hour={conditions.currentHour} />;
  if (theme.hero === 'eiri') {
    surfHero = (
      <EiriHero
        verdict={conditions.now}
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
      <CairtHero
        verdict={conditions.now}
        hour={conditions.currentHour}
        buoy={conditions.buoy}
        spot={spot}
      />
    );
  }
  if (theme.hero === 'postaer') {
    surfHero = <PostaerHero spot={spot} verdict={conditions.now} hour={conditions.currentHour} />;
  }

  const { headline } = conditions;
  const isDark = headline.kind === 'dark';
  const swimHero = (
    <SnamhHero
      swim={conditions.swimNow}
      hour={conditions.currentHour}
      waterQuality={conditions.waterQuality}
    />
  );
  const swimWindows =
    conditions.waterQuality?.restrictionInPlace === true ? (
      <p>
        Swim windows are unavailable while a bathing restriction is in place. Follow the current
        local notice.
      </p>
    ) : (
      <SwimWindowsCard windows={conditions.swimWindows} spot={spot} />
    );
  let hero =
    headline.kind === 'dark' ? (
      <DarkHero
        spot={spot}
        mode={mode}
        sunrise={headline.sunrise}
        firstLightTime={headline.firstLight?.hour.time}
        surf={headline.firstLight?.result}
        swim={conditions.swimFirstLight}
      />
    ) : (
      <>{mode === 'surf' ? surfHero : swimHero}</>
    );

  if (headline.kind === 'none') {
    hero = (
      <header style={{ maxWidth: 720, margin: '0 auto', padding: '24px' }}>
        <h1>Current conditions unavailable</h1>
        <p>
          We do not have a forecast for this hour. Reload to check for updates and check local
          advice before entering the water.
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
            <SpotSwitcher activeSpotId={spot.id} activity={activity} />
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
          {mode === 'surf' ? (
            <section
              style={{ padding: 16, border: `1px solid ${tokens.border}`, borderRadius: 12 }}
            >
              <p style={{ margin: '0 0 8px', fontSize: 14, color: tokens.textSoft }}>
                These are regional sea estimates, not measured breaking waves at {spot.name}. A GO
                is a forecast possibility, not a safety clearance or a promise of good surf.
              </p>
              <a href={`/log?spot=${encodeURIComponent(spot.id)}`} style={{ color: tokens.accent }}>
                Been to the beach? Add a quick check
              </a>
              <p style={{ margin: '8px 0 0', fontSize: 12, color: tokens.textSubtle }}>
                Save what you saw and whether it was good enough for you. Private on this device. No
                automatic forecast changes.
              </p>
              {forecastCaptureFailed ? (
                <p
                  role="status"
                  style={{ margin: '8px 0 0', fontSize: 12, color: tokens.textSoft }}
                >
                  This device could not save the forecast comparison. You can still record a beach
                  check without a matching forecast.
                </p>
              ) : null}
            </section>
          ) : null}
          {mode === 'surf' ? (
            <>
              {conditions.nextWindow !== undefined &&
              (isDark || conditions.now.verdict !== 'go') ? (
                <NextWindowCard window={conditions.nextWindow} spot={spot} />
              ) : null}
              <DayStrip days={conditions.days} spot={spot} />
            </>
          ) : (
            swimWindows
          )}
          {conditions.buoy !== undefined ? <BuoyCard buoy={conditions.buoy} spot={spot} /> : null}
          <TideCard tides={conditions.tides} spot={spot} />
          {mode === 'surf' ? <AlertCard spotId={spot.id} /> : null}
        </div>
      </main>
    </>
  );
}
