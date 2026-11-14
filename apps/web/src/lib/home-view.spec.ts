import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { SpotConditions } from '@tonnta/web-conditions';
import { ThemeProvider } from '@tonnta/web-shell';

import { AppFooter } from '@/components/app-footer';
import { HomeView } from '@/components/home-view';

vi.mock('@tonnta/web-shell', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ThemePicker: () => null,
}));
vi.mock('@/components/spot-switcher', () => ({ SpotSwitcher: () => 'spot-picker' }));
vi.mock('@/components/alert-card', () => ({ AlertCard: () => 'surf-alerts' }));
vi.mock('@/themes/cairt/cairt-hero', () => ({ CairtHero: () => null }));
vi.mock('@/themes/eiri/eiri-hero', () => ({ EiriHero: () => null }));
vi.mock('@/themes/postaer/postaer-hero', () => ({ PostaerHero: () => null }));
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
}));

// Child forecast components are mocked: this fixture isolates activity composition.
const conditions = {
  spot: { id: 'donabate', name: 'Donabate', region: 'Dublin' },
  now: { verdict: 'go' },
  headline: { kind: 'verdict' },
  tides: [],
} as unknown as SpotConditions;

function render(element: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(
    createElement(ThemeProvider, { initialThemeId: 'dawn-v1', children: element })
  );
}

describe('Surf site screen', () => {
  it('shows surf content and nothing from the swim product', () => {
    const html = render(createElement(HomeView, { conditions }));
    expect(html).toContain('surf-hero');
    expect(html).toContain('surf-alerts');
    expect(html).toContain('surf-days');
    expect(html).toContain('spot-picker');
    expect(html).not.toContain('swim-hero');
    expect(html).not.toContain('swim-windows');
    expect(html).toContain('href="/log?spot=donabate"');
    expect(html).toContain('Add a quick check');
    expect(html).toContain('regional sea estimates');
  });

  it('shows the surf night screen after dark', () => {
    const dark = { ...conditions, headline: { kind: 'dark' } } as SpotConditions;
    expect(render(createElement(HomeView, { conditions: dark }))).toContain('dark-hero:surf');
  });

  it('never displays a cached verdict when the current hour is unavailable', () => {
    const missing = { ...conditions, headline: { kind: 'none' } } as SpotConditions;
    const html = render(createElement(HomeView, { conditions: missing }));
    expect(html).toContain('Current conditions unavailable');
    expect(html).not.toContain('surf-hero');
  });

  it('links the footer to beach checks and the same spot on the swim site', () => {
    const html = render(createElement(AppFooter, { spotId: 'el-cotillo' }));
    expect(html).toContain('href="/log?spot=el-cotillo"');
    expect(html).toContain('href="https://snamh.app/s/el-cotillo"');
  });
});
