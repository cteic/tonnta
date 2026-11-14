import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { getSpot } from '@tonnta/data';
import type { DailySummary } from '@tonnta/types';

import { DayStrip } from '@/components/forecast-sections';
import { getTheme } from '@/themes/registry';

vi.mock('@/themes/theme-context', () => ({ useAppTheme: () => ({ theme: getTheme('dawn-v1') }) }));
const spot = getSpot('donabate');
if (spot === undefined) throw new Error('Missing Donabate');
const day: DailySummary = {
  date: '2026-11-09',
  verdict: 'go',
  dominantWindState: 'onshore',
  maxWaveHeightM: 1.2,
  bestWindow: { start: '2026-11-09T12:00:00Z', end: '2026-11-09T14:00:00Z' },
};

describe('Daily forecast labels', () => {
  it('distinguishes a day maximum and best forecast from a specific GO window', () => {
    const html = renderToStaticMarkup(createElement(DayStrip, { days: [day], spot }));
    expect(html).toContain('1.2');
    expect(html).toContain('m max');
    expect(html).toContain('Best forecast:');
    expect(html).toContain('GO window 12:00–15:00');
  });
  it('does not imply an all-day GO when there is no window', () => {
    const noWindow = { ...day, verdict: 'maybe' as const };
    delete noWindow.bestWindow;
    const html = renderToStaticMarkup(createElement(DayStrip, { days: [noWindow], spot }));
    expect(html).toContain('No GO window forecast');
  });
});
