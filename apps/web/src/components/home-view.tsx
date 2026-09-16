'use client';

import { useEffect, useState } from 'react';

import { AlertCard } from '@/components/alert-card';
import {
  BuoyCard,
  DayStrip,
  NextWindowCard,
  TideCard,
  Warnings,
} from '@/components/forecast-sections';
import { SeaHero } from '@/components/sea-hero';
import { SnamhHero } from '@/components/snamh-hero';
import { SwimWindowsCard } from '@/components/snamh-sections';
import { SpotSwitcher } from '@/components/spot-switcher';
import { ThemePicker } from '@/components/theme-picker';
import type { SpotConditions } from '@/lib/conditions';
import { CairtHero } from '@/themes/cairt/cairt-hero';
import { EiriHero } from '@/themes/eiri/eiri-hero';
import { PostaerHero } from '@/themes/postaer/postaer-hero';
import { useAppTheme } from '@/themes/theme-context';

/**
 * One spot, two audiences: Tonn (surf) and Snámh (swim) read the same sea.
 * The toggle persists per device — a swimmer opens straight into swim mode.
 */

type Mode = 'surf' | 'snamh';

const MODE_KEY = 'tonnta-mode';

function useMode(): [Mode, (mode: Mode) => void] {
  const [mode, setMode] = useState<Mode>('surf');

  useEffect(() => {
    const stored = window.localStorage.getItem(MODE_KEY);
    if (stored === 'snamh') {
      setMode('snamh');
    }
  }, []);

  function update(next: Mode): void {
    setMode(next);
    window.localStorage.setItem(MODE_KEY, next);
  }

  return [mode, update];
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const options: { value: Mode; label: string }[] = [
    { value: 'surf', label: 'Tonn · surf' },
    { value: 'snamh', label: 'Snámh · swim' },
  ];
  return (
    <div
      role="tablist"
      aria-label="Surf or swim conditions"
      style={{
        display: 'inline-flex',
        gap: 4,
        padding: 4,
        borderRadius: 999,
        border: `1px solid ${tokens.border}`,
        background: tokens.surface,
      }}
    >
      {options.map((option) => {
        const active = option.value === mode;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => {
              onChange(option.value);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'General Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              background: active ? tokens.toggleActiveBg : 'transparent',
              color: active ? tokens.toggleActiveText : tokens.textSoft,
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function HomeView({ conditions }: { conditions: SpotConditions }) {
  const [mode, setMode] = useMode();
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
              tonnta<span style={{ color: tokens.accent }}>.</span>
            </span>
            <span
              style={{
                fontFamily: "'Spline Sans Mono', monospace",
                fontSize: 12,
                color: tokens.textSoft,
              }}
            >
              {spot.name} · {spot.region}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SpotSwitcher activeSpotId={spot.id} />
            <ModeToggle mode={mode} onChange={setMode} />
            <ThemePicker />
          </div>
        </nav>
      </div>

      {mode === 'surf' ? (
        surfHero
      ) : (
        <SnamhHero
          swim={conditions.swimNow}
          hour={conditions.currentHour}
          waterQuality={conditions.waterQuality}
        />
      )}

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
          <>
            {conditions.nextWindow !== undefined && conditions.now.verdict !== 'go' ? (
              <NextWindowCard window={conditions.nextWindow} spot={spot} />
            ) : null}
            <DayStrip days={conditions.days} spot={spot} />
          </>
        ) : (
          <SwimWindowsCard windows={conditions.swimWindows} spot={spot} />
        )}
        {conditions.buoy !== undefined ? <BuoyCard buoy={conditions.buoy} spot={spot} /> : null}
        <TideCard tides={conditions.tides} spot={spot} />
        {mode === 'surf' ? <AlertCard spotId={spot.id} /> : null}
      </div>
    </>
  );
}
