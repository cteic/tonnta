import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { TideGaugeReading, TideTrend } from '@tonnta/types';

import { readingsAfter, tideTrend } from './tide-gauge';

const feature = await loadFeature('./tide-gauge.feature');

const START = Date.parse('2026-10-20T15:50:00Z');
const STEP_MS = 5 * 60 * 1000;

function readings(stepM: number, count = 6): TideGaugeReading[] {
  return Array.from({ length: count }, (_, index) => ({
    time: new Date(START + index * STEP_MS).toISOString().replace('.000Z', 'Z'),
    levelM: 0.3 + index * stepM,
  }));
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('A tide that has climbed over 15 minutes is rising', ({ Given, When, Then }) => {
    let source: TideGaugeReading[] = [];
    let trend: TideTrend | undefined;
    Given('gauge readings that climb 2 cm every 5 minutes', () => {
      source = readings(0.02);
    });
    When('I read the trend', () => {
      trend = tideTrend(source);
    });
    Then('the tide is "rising"', () => {
      expect(trend).toBe('rising');
    });
  });

  Scenario('A tide that has dropped over 15 minutes is falling', ({ Given, When, Then }) => {
    let source: TideGaugeReading[] = [];
    let trend: TideTrend | undefined;
    Given('gauge readings that drop 2 cm every 5 minutes', () => {
      source = readings(-0.02);
    });
    When('I read the trend', () => {
      trend = tideTrend(source);
    });
    Then('the tide is "falling"', () => {
      expect(trend).toBe('falling');
    });
  });

  Scenario('Near high water the tide is slack', ({ Given, When, Then }) => {
    let source: TideGaugeReading[] = [];
    let trend: TideTrend | undefined;
    Given('gauge readings that move less than a centimetre every 5 minutes', () => {
      source = readings(0.005);
    });
    When('I read the trend', () => {
      trend = tideTrend(source);
    });
    Then('the tide is "slack"', () => {
      expect(trend).toBe('slack');
    });
  });

  Scenario('Too short a history gives no trend', ({ Given, When, Then }) => {
    let source: TideGaugeReading[] = [];
    let trend: TideTrend | undefined = 'rising';
    Given('two gauge readings 5 minutes apart', () => {
      source = readings(0.02, 2);
    });
    When('I read the trend', () => {
      trend = tideTrend(source);
    });
    Then('there is no trend', () => {
      expect(trend).toBeUndefined();
    });
  });

  Scenario('A stream sends only readings the client has not seen', ({ Given, When, Then }) => {
    let source: TideGaugeReading[] = [];
    let fresh: TideGaugeReading[] = [];
    Given('gauge readings that climb 2 cm every 5 minutes', () => {
      source = readings(0.02);
    });
    When('I take the readings after 16:05', () => {
      fresh = readingsAfter(source, '2026-10-20T16:05:00Z');
    });
    Then('only the 16:10 and 16:15 readings remain', () => {
      expect(fresh.map((reading) => reading.time)).toEqual([
        '2026-10-20T16:10:00Z',
        '2026-10-20T16:15:00Z',
      ]);
    });
  });
});
