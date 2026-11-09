import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { getSpot } from '@tonnta/data';
import type { DailySummary } from '@tonnta/types';
import { ThemeProvider } from '@tonnta/web-shell';

import { DayStrip } from './forecast-sections';

const spot = getSpot('donabate');
if (spot === undefined) throw new Error('Missing Donabate');
const day: DailySummary = {
  date: '2026-11-09',
  verdict: 'go',
  dominantWindState: 'onshore',
  maxWaveHeightM: 1.2,
  bestWindow: { start: '2026-11-09T12:00:00Z', end: '2026-11-09T14:00:00Z' },
};

function render(element: ReturnType<typeof createElement>): string {
  return renderToStaticMarkup(
    createElement(ThemeProvider, { initialThemeId: 'dawn-v1', children: element })
  );
}

describe('Daily forecast labels', () => {
  it('distinguishes a day maximum and best forecast from a specific GO window', () => {
    const html = render(createElement(DayStrip, { days: [day], spot }));
    expect(html).toContain('1.2');
    expect(html).toContain('m max');
    expect(html).toContain('Best forecast:');
    expect(html).toContain('GO window 12:00–15:00');
  });
  it('does not imply an all-day GO when there is no window', () => {
    const noWindow = { ...day, verdict: 'maybe' as const };
    delete noWindow.bestWindow;
    const html = render(createElement(DayStrip, { days: [noWindow], spot }));
    expect(html).toContain('No GO window forecast');
  });
});
