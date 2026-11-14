import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { classifyWind, getSpot } from '@tonnta/data';
import type { GoodWindow } from '@tonnta/data';
import type { HourlyConditions, Spot } from '@tonnta/types';

import { parseUnsubscribeEndpoint, upcomingAlertWindow } from './alerts';

const feature = await loadFeature('./alerts.feature');

const donabate = getSpot('donabate');
if (donabate === undefined) {
  throw new Error('Donabate spot missing from registry');
}
const spot: Spot = donabate;

/** UTC times in July, when Donabate is on UTC+1 and every hour here is in session. */
function hour(day: number, utcHour: number, waveHeightM: number): HourlyConditions {
  const windSpeedKmh = 12;
  const windDirectionDeg = 250;
  return {
    time: `2026-07-${String(day).padStart(2, '0')}T${String(utcHour).padStart(2, '0')}:00:00Z`,
    waveHeightM,
    wavePeriodS: 5,
    waveDirectionDeg: 90,
    windSpeedKmh,
    windGustKmh: 16,
    windDirectionDeg,
    windState: classifyWind(windDirectionDeg, windSpeedKmh, spot),
  };
}

const go = (day: number, utcHour: number) => hour(day, utcHour, 0.6);
const NOON_ON_THE_4TH = Date.parse('2026-07-04T11:00:00Z');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The alert names the next window, not the longest', ({ Given, When, Then }) => {
    let hours: HourlyConditions[] = [];
    let window: GoodWindow | undefined;
    Given('a two-hour GO window this afternoon and a four-hour one tomorrow morning', () => {
      hours = [go(4, 14), go(4, 15), go(5, 7), go(5, 8), go(5, 9), go(5, 10)];
    });
    When('the alert check runs at noon', () => {
      window = upcomingAlertWindow(hours, spot, NOON_ON_THE_4TH);
    });
    Then('it announces the afternoon window', () => {
      expect(window?.start).toBe('2026-07-04T14:00:00Z');
    });
  });

  Scenario('A window that has ended is not announced', ({ Given, When, Then }) => {
    let hours: HourlyConditions[] = [];
    let window: GoodWindow | undefined;
    Given('a GO window this morning and nothing after it', () => {
      hours = [go(4, 7), go(4, 8), hour(4, 9, 0.2), hour(4, 12, 0.2)];
    });
    When('the alert check runs at noon', () => {
      window = upcomingAlertWindow(hours, spot, NOON_ON_THE_4TH);
    });
    Then('it announces nothing', () => {
      expect(window).toBeUndefined();
    });
  });

  Scenario('A window more than a day away is not announced', ({ Given, When, Then }) => {
    let hours: HourlyConditions[] = [];
    let window: GoodWindow | undefined;
    Given('a GO window starting the day after tomorrow', () => {
      hours = [go(6, 9), go(6, 10)];
    });
    When('the alert check runs at noon', () => {
      window = upcomingAlertWindow(hours, spot, NOON_ON_THE_4TH);
    });
    Then('it announces nothing', () => {
      expect(window).toBeUndefined();
    });
  });

  Scenario('Unsubscribing needs only the endpoint', ({ Then }) => {
    Then('a body with only an endpoint is accepted and a body without one is rejected', () => {
      expect(parseUnsubscribeEndpoint({ endpoint: 'https://push.test/a' })).toBe(
        'https://push.test/a'
      );
      expect(parseUnsubscribeEndpoint({ p256dh: 'k' })).toBeUndefined();
      expect(parseUnsubscribeEndpoint('nonsense')).toBeUndefined();
    });
  });
});
