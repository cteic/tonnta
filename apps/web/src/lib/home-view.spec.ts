import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { assessHour, getSpot, headlineFor, summarizeDayFacts, summarizeDays } from '@tonnta/data';
import type { HourlyConditions } from '@tonnta/types';
import type { SpotConditions } from '@tonnta/web-conditions';
import { ThemeProvider } from '@tonnta/web-shell';
import type { ThemeId } from '@tonnta/web-shell';

import { AppFooter } from '@/components/app-footer';
import { HomeView } from '@/components/home-view';

vi.mock('@tonnta/web-shell', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ThemePicker: () => null,
}));
vi.mock('@/components/spot-switcher', () => ({ SpotSwitcher: () => 'spot-picker' }));
// Pro alerts are out of scope for the facts-only change and keep their own copy.
vi.mock('@/components/alert-card', () => ({ AlertCard: () => 'surf-alerts' }));

const donabate = getSpot('donabate');
if (donabate === undefined) throw new Error('Donabate missing');
const spot = donabate;

/** Midday on a summer Saturday at Donabate: daylight, so the headline is the live hour. */
const NOW = Date.parse('2026-07-04T12:30:00Z');
const START = Date.parse('2026-07-04T00:00:00Z');

/** Clean, calm, GO-worthy sea: 0.8m at 9s with a light offshore westerly. */
const hours: HourlyConditions[] = Array.from({ length: 48 }, (_, i) => ({
  time: new Date(START + i * 3_600_000).toISOString(),
  waveHeightM: 0.8,
  wavePeriodS: 9,
  waveDirectionDeg: 70,
  windSpeedKmh: 12,
  windGustKmh: 18,
  windDirectionDeg: 250,
  windState: 'offshore',
  seaTempC: 15.2,
}));

function goConditions(): SpotConditions {
  const currentHour = hours[12];
  if (currentHour === undefined) throw new Error('Missing current hour');
  return {
    spot,
    loadedAt: NOW,
    now: assessHour(currentHour, spot),
    headline: headlineFor(hours, spot, NOW),
    currentHour,
    days: summarizeDays(hours, spot),
    dayFacts: summarizeDayFacts(hours, spot),
    hours,
    tides: [{ time: '2026-07-04T15:00:00Z', kind: 'high', heightM: 1.9 }],
    swimNow: { verdict: 'ok', reason: 'Calm', nearHighTide: false },
    swimWindows: [],
    warnings: [],
  };
}

function render(element: ReturnType<typeof createElement>, themeId: ThemeId = 'dawn-v1'): string {
  return renderToStaticMarkup(
    createElement(ThemeProvider, { initialThemeId: themeId, children: element })
  );
}

/** What a reader sees: no tags, attributes, class names or inline CSS. */
function visibleText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

const THEME_IDS: readonly ThemeId[] = ['eiri', 'cairt', 'postaer', 'dawn-v1'];

const VERDICT_WORDS = /\b(go|grand|great|maybe|flat|worth it|blown out|téigh)\b/i;

describe('Surf site screen', () => {
  it('starts from a GO-worthy hour, so the facts-only checks below mean something', () => {
    const conditions = goConditions();
    expect(conditions.now.verdict).toBe('go');
    expect(conditions.now.board).toBe('longboard');
    expect(conditions.headline.kind).toBe('verdict');
  });

  for (const themeId of THEME_IDS) {
    it(`shows facts and a board tag with no verdict under the ${themeId} theme`, () => {
      const text = visibleText(
        render(createElement(HomeView, { conditions: goConditions() }), themeId)
      );
      expect(text).not.toMatch(VERDICT_WORDS);
      expect(text).not.toMatch(/next good window/i);
      expect(text).toContain('0.8m');
      expect(text).toContain('12km/h');
      expect(text).toContain('WSW');
      expect(text).toMatch(/offshore/);
      expect(text).toMatch(/Board:?\s+Longboard/i);
      expect(text).not.toMatch(/Longboard day/i);
    });
  }

  it('shows plain per-day facts in the week strip', () => {
    const text = visibleText(render(createElement(HomeView, { conditions: goConditions() })));
    expect(text).toContain('The week ahead');
    expect(text).toContain('9s');
    expect(text).toContain('MSL');
    expect(text).toContain('sunrise');
    expect(text).toContain('sunset');
  });

  it('links to the about page and the beach check log', () => {
    const html = render(createElement(HomeView, { conditions: goConditions() }));
    expect(html).toContain('href="/about"');
    expect(html).toContain('href="/log?spot=donabate"');
    expect(html).toContain('regional sea estimates');
    expect(html).toContain('information, not advice');
    expect(html).toContain('spot-picker');
    expect(html).toContain('surf-alerts');
  });

  it('shows the surf night screen after dark with first light as facts', () => {
    const night = Date.parse('2026-07-04T01:30:00Z');
    const dark: SpotConditions = {
      ...goConditions(),
      headline: headlineFor(hours, spot, night),
    };
    expect(dark.headline.kind).toBe('dark');
    const html = render(createElement(HomeView, { conditions: dark }));
    expect(html).toContain('data-testid="dark-hero"');
    const text = visibleText(html);
    expect(text).toContain('Dark now');
    expect(text).not.toMatch(VERDICT_WORDS);
  });

  it('shows Unknown and no board tag when the current hour is missing', () => {
    const base = goConditions();
    const missing: SpotConditions = {
      ...base,
      headline: { kind: 'none' },
      now: { verdict: 'flat', reason: 'No forecast data. Check back shortly.' },
    };
    delete missing.currentHour;
    for (const themeId of THEME_IDS) {
      const text = visibleText(render(createElement(HomeView, { conditions: missing }), themeId));
      expect(text).toContain('Current conditions unavailable');
      expect(text).toContain('Unknown');
      expect(text).not.toMatch(/\bBoard\b/);
      expect(text).not.toMatch(/Longboard|Foamie|SUP\b/);
      expect(text).not.toMatch(VERDICT_WORDS);
    }
  });

  it('links the footer to beach checks, the about page and the same spot on the swim site', () => {
    const html = render(createElement(AppFooter, { spotId: 'el-cotillo' }));
    expect(html).toContain('href="/log?spot=el-cotillo"');
    expect(html).toContain('href="/about"');
    expect(html).toContain('href="https://snamh.app/s/el-cotillo"');
    expect(html).toContain('In an emergency call 112 or 999 and ask for the Coast Guard.');
  });
});
