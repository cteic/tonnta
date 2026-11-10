import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { applyWaterQuality, assessSwimHour, getSpot, headlineFor } from '@tonnta/data';
import type { HourlyConditions, WaterQualityStatus } from '@tonnta/types';
import type { SpotConditions } from '@tonnta/web-conditions';
import { conditionsAt } from '@tonnta/web-conditions';
import { ThemeProvider } from '@tonnta/web-shell';

import { SwimView } from './swim-view';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => undefined }) }));
vi.mock('@tonnta/web-shell', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  ThemePicker: () => null,
}));
const found = getSpot('donabate');
if (found === undefined) throw new Error('Missing Donabate');
const spot = found;
const hour: HourlyConditions = {
  time: '2026-07-01T12:00:00Z',
  waveHeightM: 0.2,
  wavePeriodS: 5,
  waveDirectionDeg: 90,
  windSpeedKmh: 8,
  windGustKmh: 12,
  windDirectionDeg: 270,
  windState: 'offshore',
};
function fixture(): SpotConditions {
  return {
    spot,
    loadedAt: Date.parse(hour.time),
    now: { verdict: 'flat', reason: 'Small' },
    headline: headlineFor([hour], spot, Date.parse(hour.time)),
    currentHour: hour,
    hours: [hour],
    tides: [],
    days: [],
    warnings: [],
    waterQualityCheck: { status: 'checked', checkedAt: Date.parse(hour.time) },
    waterQualityStatus: 'not-reported',
    swimNow: assessSwimHour(hour, []),
    swimWindows: [],
  };
}
function render(conditions: SpotConditions): string {
  return renderToStaticMarkup(
    createElement(ThemeProvider, {
      initialThemeId: 'dawn-v1',
      children: createElement(SwimView, { conditions }),
    })
  );
}
describe('Real swim screen safety explanations', () => {
  it('bypasses the generic empty card during a known restriction', () => {
    const value = fixture();
    value.waterQuality = { beachId: 'donabate', beachName: 'Donabate', restrictionInPlace: true };
    value.swimNow = applyWaterQuality(value.swimNow, value.waterQuality);
    const html = render(value);
    expect(html).toContain('bathing restriction is in place');
    expect(html).toContain('NOT TODAY');
    expect(html).not.toContain('PERFECT');
    expect(html).not.toContain('the sea needs to settle');
    expect(html).not.toContain('No swim windows are available from the current forecast');
  });
  it('does not claim rough sea merely because an aged forecast has no windows', () => {
    const value = fixture();
    const html = render(conditionsAt(value, value.loadedAt + 3_600_000));
    expect(html).toContain('Current conditions unavailable');
    expect(html).not.toContain('the sea needs to settle');
    expect(html).toContain('Bathing notices need rechecking');
  });
  it('does not claim rough sea merely because the forecast source failed', () => {
    const value = fixture();
    value.headline = { kind: 'none' };
    value.hours = [];
    delete value.currentHour;
    value.swimNow = { verdict: 'no', reason: 'No forecast data', nearHighTide: false };
    value.warnings = ['The wave forecast is unavailable right now'];
    const html = render(value);
    expect(html).toContain('Current conditions unavailable');
    expect(html).not.toContain('the sea needs to settle');
    expect(html).toContain('No swimming recommendation is being made');
  });
  it.each([
    'not-reported',
    'checked',
    'unavailable',
    'unmapped',
    'stale',
    'unchecked',
  ] as WaterQualityStatus[])('keeps %s knowledge separate from raw calm weather', (status) => {
    const value = fixture();
    value.waterQualityStatus = status;
    value.swimWindows = [{ start: hour.time, end: hour.time, hours: [hour], nearHighTide: false }];
    const html = render(value);
    expect(html).toContain('CHECK LOCAL ADVICE');
    expect(html).not.toContain('PERFECT');
    expect(html).not.toContain('CALM CONDITIONS');
    expect(html).toContain('0.2m sea');
    expect(html).toContain('No swimming recommendation is being made');
    expect(html).not.toContain('low water, a long walk out');
  });
  it('does not turn an empty seasonal notice response into positive swimming advice', () => {
    const html = render(fixture());
    expect(html).toContain('CHECK LOCAL ADVICE');
    expect(html).not.toContain('CALM CONDITIONS');
    expect(html).not.toContain('PERFECT');
    expect(html).toContain('in-season alerts');
    expect(html).toContain('Current water quality is unknown');
    expect(html).toContain('no dated water sample was checked');
    expect(html).toContain('not a water sampling time');
  });
  it('preserves a real lightning warning alongside unknown bathing advice', () => {
    const value = fixture();
    value.waterQualityStatus = 'unavailable';
    value.swimNow = assessSwimHour({ ...hour, weatherCode: 95 }, []);
    const html = render(value);
    expect(html).toContain('NOT TODAY');
    expect(html).toContain('Lightning');
    expect(html).toContain('bathing-notice check failed');
  });
  it('never promotes a first-light weather preview to swimming advice when notices are unknown', () => {
    const value = fixture();
    value.waterQualityStatus = 'unavailable';
    value.headline = {
      kind: 'dark',
      sunrise: '2026-07-02T04:00:00Z',
      firstLight: {
        hour: { ...hour, time: '2026-07-02T05:00:00Z' },
        result: { verdict: 'flat', reason: 'Small sea' },
      },
    };
    value.swimFirstLight = assessSwimHour(hour, []);
    const html = render(value);
    expect(html).toContain('Out of the water');
    expect(html).toContain('CHECK LOCAL ADVICE');
    expect(html).not.toContain('CALM CONDITIONS');
    expect(html).toContain('not a prediction of water quality');
  });
  it('renders malformed retained retrieval timestamps without inventing a fresh check', () => {
    const value = fixture();
    value.waterQualityStatus = 'unchecked';
    value.waterQualityCheck = { status: 'checked', checkedAt: 1e30 };
    const html = render(value);
    expect(html).toContain('have not been checked');
    expect(html).not.toContain('Notices retrieved');
  });
});
