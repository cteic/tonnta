import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { getSpot } from '@tonnta/data';
import type { Spot, VerdictResult } from '@tonnta/types';

import { chartScrubbed, outlookViewed } from './analytics-events';
import type { ChartHour, SpotOutlook } from './conditions';

const feature = await loadFeature('./analytics-events.feature');

function donabate(): Spot {
  const spot = getSpot('donabate');
  if (spot === undefined) throw new Error('donabate missing');
  return spot;
}

function outlook(now: VerdictResult): SpotOutlook {
  return { spot: donabate(), now, days: [], hours: [] };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Opening the outlook records the spot, verdict and board', ({ Given, Then }) => {
    let source: SpotOutlook | undefined;
    Given('a GO outlook at Donabate on a foamie', () => {
      source = outlook({ verdict: 'go', board: 'foamie', reason: 'worth going down' });
    });
    Then(
      'the outlook_viewed event carries spot "donabate", verdict "go" and board "foamie"',
      () => {
        if (source === undefined) throw new Error('no outlook');
        expect(outlookViewed(source)).toEqual({ spot: 'donabate', verdict: 'go', board: 'foamie' });
      }
    );
  });

  Scenario('A verdict with no board records the board as null', ({ Given, Then }) => {
    let source: SpotOutlook | undefined;
    Given('a FLAT outlook at Donabate', () => {
      source = outlook({ verdict: 'flat', reason: 'flat calm' });
    });
    Then('the outlook_viewed event carries board null', () => {
      if (source === undefined) throw new Error('no outlook');
      expect(outlookViewed(source).board).toBeNull();
    });
  });

  Scenario('Scrubbing records how far ahead the reader looked', ({ Given, Then, And }) => {
    let hours: ChartHour[] = [];
    Given('24 chart hours where hour 15 is flat', () => {
      hours = Array.from({ length: 24 }, (_, index) => ({
        time: new Date(Date.UTC(2026, 9, 21, index)).toISOString(),
        waveHeightM: 0.5,
        windSpeedKmh: 15,
        verdict: index === 15 ? 'flat' : 'go',
      }));
    });
    Then('scrubbing to hour 15 records hours_ahead 15 and verdict "flat"', () => {
      expect(chartScrubbed('donabate', hours, 15)).toEqual({
        spot: 'donabate',
        hours_ahead: 15,
        verdict: 'flat',
      });
    });
    And('scrubbing past the end records nothing', () => {
      expect(chartScrubbed('donabate', hours, 24)).toBeUndefined();
    });
  });
});
