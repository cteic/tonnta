import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { getSpot } from '@tonnta/data';
import type { HourlyConditions, Spot } from '@tonnta/types';
import type { SpotConditions } from '@tonnta/web-conditions';
import { ThemeProvider } from '@tonnta/web-shell';

import { SwimFooter } from './swim-footer';
import { SwimView } from './swim-view';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined }) }));
vi.mock('@tonnta/web-shell', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ThemePicker: () => null,
}));
vi.mock('@tonnta/web-conditions', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  SeaHero: () => 'surf-hero',
  SnamhHero: () => 'swim-hero',
  DarkHero: ({ mode }: { mode: string }) => `dark-hero:${mode}`,
  SwimWindowsCard: () => 'swim-windows',
  BuoyCard: () => null,
  DayStrip: () => 'surf-days',
  NextWindowCard: () => 'surf-next-window',
  TideCard: () => 'tides',
  Warnings: () => 'warnings',
  useLiveConditions: (conditions: unknown) => conditions,
}));

function render(element: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(
    createElement(ThemeProvider, { initialThemeId: 'dawn-v1', children: element })
  );
}

function donabate(): Spot {
  const found = getSpot('donabate');
  if (found === undefined) throw new Error('Missing Donabate');
  return found;
}
const spot = donabate();

const hour: HourlyConditions = {
  time: '2026-07-01T12:00:00Z',
  waveHeightM: 0.3,
  wavePeriodS: 5,
  waveDirectionDeg: 90,
  windSpeedKmh: 8,
  windGustKmh: 12,
  windDirectionDeg: 270,
  windState: 'offshore',
};

function conditions(overrides: Partial<SpotConditions>): SpotConditions {
  return {
    spot,
    loadedAt: Date.parse(hour.time),
    now: { verdict: 'maybe', reason: 'Small' },
    headline: { kind: 'verdict', hour, result: { verdict: 'maybe', reason: 'Small' } },
    currentHour: hour,
    days: [],
    hours: [hour],
    tides: [],
    swimNow: { verdict: 'ok', reason: 'A good swim', nearHighTide: false },
    swimWindows: [],
    warnings: [],
    ...overrides,
  };
}

describe('Swim site screen', () => {
  it('shows swimming and nothing from the surf product', () => {
    const html = render(createElement(SwimView, { conditions: conditions({}) }));
    expect(html).toContain('swim-hero');
    expect(html).toContain('swim-windows');
    expect(html).toContain('Snámh');
    expect(html).not.toContain('surf-hero');
    expect(html).not.toContain('surf-days');
    expect(html).not.toContain('surf-next-window');
    expect(html).not.toContain('beach check');
  });

  it('shows the swim night screen after dark', () => {
    const html = render(
      createElement(SwimView, { conditions: conditions({ headline: { kind: 'dark' } }) })
    );
    expect(html).toContain('dark-hero:snamh');
    expect(html).not.toContain('swim-hero');
  });

  it('says conditions are unavailable instead of showing a verdict', () => {
    const html = render(
      createElement(SwimView, { conditions: conditions({ headline: { kind: 'none' } }) })
    );
    expect(html).toContain('Current conditions unavailable');
    expect(html).not.toContain('swim-hero');
  });

  it('withholds swim windows under a bathing restriction', () => {
    const html = render(
      createElement(SwimView, {
        conditions: conditions({
          waterQuality: { beachId: 'donabate', beachName: 'Donabate', restrictionInPlace: true },
        }),
      })
    );
    expect(html).toContain('bathing restriction');
    expect(html).not.toContain('swim-windows');
  });

  it('links the footer to the same spot on the surf site', () => {
    const html = render(createElement(SwimFooter, { spotId: 'el-cotillo' }));
    expect(html).toContain('href="https://tonnta.surf/s/el-cotillo"');
    expect(html).toContain('not a lifeguard');
  });
});
