import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { getSpot } from '@tonnta/data';
import type { DayFacts } from '@tonnta/types';
import { ThemeProvider } from '@tonnta/web-shell';

import { BuoyCard, DayStrip, TideCard } from './forecast-sections';

const spot = getSpot('donabate');
if (spot === undefined) throw new Error('Missing Donabate');
const day: DayFacts = {
  date: '2026-11-09',
  minWaveHeightM: 0.4,
  maxWaveHeightM: 1.2,
  minWavePeriodS: 6,
  maxWavePeriodS: 9,
  minWindSpeedKmh: 10,
  maxWindSpeedKmh: 22,
  maxWindGustKmh: 31,
  windDirectionDeg: 250,
};

function render(element: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(
    createElement(ThemeProvider, { initialThemeId: 'dawn-v1', children: element })
  );
}

function visibleText(html: string): string {
  return html.replace(/<[^>]*>/g, ' ');
}

describe('Week strip', () => {
  it('shows each day as wave, period and wind ranges with direction', () => {
    const text = visibleText(render(createElement(DayStrip, { days: [day], spot })));
    expect(text).toContain('0.4–1.2m');
    expect(text).toContain('6–9s');
    expect(text).toContain('10–22km/h WSW');
    expect(text).toContain('31km/h');
  });

  it('carries no verdict words or GO windows', () => {
    const text = visibleText(render(createElement(DayStrip, { days: [day], spot })));
    expect(text).not.toMatch(/\b(go|grand|great|maybe|flat|worth it|best forecast)\b/i);
    expect(text).not.toMatch(/window/i);
  });

  it('reads Unknown when there is no daily forecast', () => {
    const text = visibleText(render(createElement(DayStrip, { days: [], spot })));
    expect(text).toContain('Unknown');
  });
});

describe('Tides and buoy', () => {
  it('labels tide heights as relative to mean sea level', () => {
    const text = visibleText(
      render(
        createElement(TideCard, {
          tides: [{ time: '2026-11-09T12:00:00Z', kind: 'high', heightM: 1.8 }],
          spot,
        })
      )
    );
    expect(text).toContain('1.8m MSL');
    expect(text).toContain('relative to mean sea level');
  });

  it('reads Unknown for tides that did not load', () => {
    expect(visibleText(render(createElement(TideCard, { tides: [], spot })))).toContain(
      'Tide times: Unknown'
    );
  });

  it('reads Unknown for buoy values that are missing', () => {
    const text = visibleText(
      render(
        createElement(BuoyCard, {
          buoy: {
            stationId: 'M2',
            time: '2026-11-09T12:00:00Z',
            waveHeightM: 1.1,
            source: 'marine-institute',
          },
          spot,
        })
      )
    );
    expect(text).toContain('1.10m');
    expect(text).toContain('Unknown');
  });
});
