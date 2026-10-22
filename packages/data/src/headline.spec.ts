import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { HourlyConditions } from '@tonnta/types';

import type { Headline } from './headline';
import { headlineFor } from './headline';
import { getSpot } from './spots';
import { classifyWind } from './verdict';

const feature = await loadFeature('./headline.feature');

const donabate = getSpot('donabate');
if (donabate === undefined) {
  throw new Error('Donabate spot missing from registry');
}
const spot = donabate;

const HOUR_MS = 60 * 60 * 1000;
/** Irish summer time runs to 25 October 2026, so Irish time is UTC+1. */
const START = Date.parse('2026-10-22T00:00:00Z');

function forecast(): HourlyConditions[] {
  return Array.from({ length: 48 }, (_, i) => {
    const windDirectionDeg = 250;
    const windSpeedKmh = 12;
    return {
      time: new Date(START + i * HOUR_MS).toISOString().replace('.000Z', 'Z'),
      waveHeightM: 0.6,
      wavePeriodS: 5,
      waveDirectionDeg: 90,
      windSpeedKmh,
      windGustKmh: 16,
      windDirectionDeg,
      windState: classifyWind(windDirectionDeg, windSpeedKmh, spot),
    };
  });
}

const irish = (day: number, clock: string) => {
  const [h = '0', m = '0'] = clock.split(':');
  return Date.UTC(2026, 9, day, Number(h) - 1, Number(m));
};

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'In daylight the headline is the verdict for the hour in progress',
    ({ Given, When, Then }) => {
      let hours: HourlyConditions[] = [];
      let headline: Headline = { kind: 'none' };
      Given('the forecast for 22 October at Donabate', () => {
        hours = forecast();
      });
      When('it is 11:30 Irish time', () => {
        headline = headlineFor(hours, spot, irish(22, '11:30'));
      });
      Then('the headline is the verdict for the 11:00 hour', () => {
        expect(headline.kind).toBe('verdict');
        if (headline.kind === 'verdict') {
          expect(headline.hour.time).toBe('2026-10-22T10:00:00Z');
          expect(headline.result.verdict).toBe('go');
        }
      });
    }
  );

  Scenario(
    'After dark there is no verdict, only sunrise and the first-light verdict',
    ({ Given, When, Then, And }) => {
      let hours: HourlyConditions[] = [];
      let headline: Headline = { kind: 'none' };
      Given('the forecast for 22 October at Donabate', () => {
        hours = forecast();
      });
      When('it is 21:00 Irish time', () => {
        headline = headlineFor(hours, spot, irish(22, '21:00'));
      });
      Then('the headline says it is dark', () => {
        expect(headline.kind).toBe('dark');
      });
      And('it gives the next sunrise, about 08:05 Irish time', () => {
        if (headline.kind !== 'dark') throw new Error('not dark');
        const gap = Math.abs(Date.parse(headline.sunrise ?? '') - irish(23, '08:05'));
        expect(gap).toBeLessThan(5 * 60 * 1000);
      });
      And('it previews the verdict for the first light hour, 08:00', () => {
        if (headline.kind !== 'dark') throw new Error('not dark');
        expect(headline.firstLight?.hour.time).toBe('2026-10-23T07:00:00Z');
        expect(headline.firstLight?.result.verdict).toBe('go');
      });
    }
  );
});
