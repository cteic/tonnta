import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { HourlyConditions } from '@tonnta/types';
import { ThemeProvider } from '@tonnta/web-shell';

import { SeaHero } from './sea-hero';

const glassyHour: HourlyConditions = {
  time: '2026-11-27T14:00:00Z',
  waveHeightM: 0.6,
  wavePeriodS: 5,
  waveDirectionDeg: 70,
  windSpeedKmh: 6,
  windGustKmh: 12,
  windDirectionDeg: 270,
  windState: 'glassy',
};

function renderSeaHero(hour: HourlyConditions | undefined): string {
  return renderToStaticMarkup(
    createElement(ThemeProvider, {
      initialThemeId: 'dawn-v1',
      children: createElement(SeaHero, { hour, spotName: 'Donabate' }),
    })
  );
}

describe('sea-state word in the default hero', () => {
  it('shows the word and the number rule behind it', () => {
    const html = renderSeaHero(glassyHour);
    expect(html).toContain('data-sea-state="Glassy"');
    expect(html).toContain('wind under 8km/h');
  });

  it('shows no word when there is no current hour', () => {
    expect(renderSeaHero(undefined)).not.toContain('data-sea-state');
  });
});
