import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { AppFooter } from '@/components/app-footer';
import { HomeView } from '@/components/home-view';
import { getTheme } from '@/themes/registry';

import type { SpotConditions } from './conditions';

vi.mock('@/themes/theme-context', () => ({ useAppTheme: () => ({ theme: getTheme('dawn-v1') }) }));
vi.mock('@/components/theme-picker', () => ({ ThemePicker: () => null }));
vi.mock('@/components/spot-switcher', () => ({
  SpotSwitcher: ({ activity }: { activity: string }) => `spot-picker:${activity}`,
}));
vi.mock('@/components/alert-card', () => ({ AlertCard: () => 'surf-alerts' }));
vi.mock('@/components/sea-hero', () => ({ SeaHero: () => 'surf-hero' }));
vi.mock('@/components/snamh-hero', () => ({ SnamhHero: () => 'swim-hero' }));
vi.mock('@/components/dark-hero', () => ({
  DarkHero: ({ mode }: { mode: string }) => `dark-hero:${mode}`,
}));
vi.mock('@/components/snamh-sections', () => ({ SwimWindowsCard: () => 'swim-windows' }));
vi.mock('@/themes/cairt/cairt-hero', () => ({ CairtHero: () => null }));
vi.mock('@/themes/eiri/eiri-hero', () => ({ EiriHero: () => null }));
vi.mock('@/themes/postaer/postaer-hero', () => ({ PostaerHero: () => null }));
vi.mock('@/components/forecast-sections', () => ({
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

describe('Activity-specific server-rendered screens', () => {
  it('renders swimming immediately, without surf controls or a mode toggle', () => {
    const html = renderToStaticMarkup(createElement(HomeView, { conditions, activity: 'swim' }));
    expect(html).toContain('Tonnta Swim');
    expect(html).toContain('swim-hero');
    expect(html).toContain('swim-windows');
    expect(html).toContain('spot-picker:swim');
    expect(html).not.toContain('surf-alerts');
    expect(html).not.toContain('surf-days');
    expect(html).not.toContain('tablist');
    expect(html).not.toContain('Add a quick check');
  });

  it('keeps existing default routes surf-only', () => {
    const html = renderToStaticMarkup(createElement(HomeView, { conditions }));
    expect(html).toContain('surf-hero');
    expect(html).toContain('surf-alerts');
    expect(html).toContain('surf-days');
    expect(html).toContain('spot-picker:surf');
    expect(html).not.toContain('swim-hero');
    expect(html).toContain('href="/log?spot=donabate"');
    expect(html).toContain('Add a quick check');
    expect(html).toContain('regional sea estimates');
  });

  it('passes the correct activity to the existing night safety screen', () => {
    const dark = { ...conditions, headline: { kind: 'dark' } } as SpotConditions;
    expect(
      renderToStaticMarkup(createElement(HomeView, { conditions: dark, activity: 'swim' }))
    ).toContain('dark-hero:snamh');
    expect(
      renderToStaticMarkup(createElement(HomeView, { conditions: dark, activity: 'surf' }))
    ).toContain('dark-hero:surf');
  });

  it('never displays a cached verdict when the current hour is unavailable', () => {
    const missing = { ...conditions, headline: { kind: 'none' } } as SpotConditions;
    for (const activity of ['surf', 'swim'] as const) {
      const html = renderToStaticMarkup(createElement(HomeView, { conditions: missing, activity }));
      expect(html).toContain('Current conditions unavailable');
      expect(html).not.toContain('surf-hero');
      expect(html).not.toContain('swim-hero');
    }
  });

  it('suppresses swim windows under an active bathing restriction', () => {
    const restricted = {
      ...conditions,
      waterQuality: { restrictionInPlace: true },
    } as SpotConditions;
    const html = renderToStaticMarkup(
      createElement(HomeView, { conditions: restricted, activity: 'swim' })
    );
    expect(html).not.toContain('swim-windows');
    expect(html).toContain('bathing restriction is in place');
  });

  it('keeps the surf-only diary out of swimming and cross-links the same spot', () => {
    const swim = renderToStaticMarkup(
      createElement(AppFooter, { activity: 'swim', spotId: 'other' })
    );
    expect(swim).not.toContain('href="/log');
    expect(swim).toContain('href="/s/other"');
    const surf = renderToStaticMarkup(
      createElement(AppFooter, { activity: 'surf', spotId: 'other' })
    );
    expect(surf).toContain('href="/log?spot=other"');
    expect(surf).toContain('href="/swim/s/other"');
  });
});
