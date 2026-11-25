import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { DailySummary, HourlyConditions, Spot } from '@tonnta/types';

import { getSpot } from './spots';
import type { GoodWindow } from './summary';
import { findGoodWindows, nextGoodWindow, summarizeDays } from './summary';
import { classifyWind } from './verdict';

const feature = await loadFeature('./summary.feature');

const donabate = getSpot('donabate');
if (donabate === undefined) {
  throw new Error('Donabate spot missing from registry');
}
const spot: Spot = donabate;

/** Donabate is on Irish summer time (UTC+1) on this date. */
function utc(localClock: string): string {
  const hour = Number(localClock.slice(0, 2)) - 1;
  return `2026-07-04T${String(hour).padStart(2, '0')}:00:00Z`;
}

function hour(
  localClock: string,
  waveHeightM: number,
  windSpeedKmh: number,
  windDirectionDeg: number
): HourlyConditions {
  return {
    time: utc(localClock),
    waveHeightM,
    wavePeriodS: 5,
    waveDirectionDeg: 90,
    windSpeedKmh,
    windGustKmh: windSpeedKmh * 1.3,
    windDirectionDeg,
    windState: classifyWind(windDirectionDeg, windSpeedKmh, spot),
  };
}

/** GO: 0.6m at 5s under a light west-southwesterly, offshore at Donabate. */
const go = (clock: string) => hour(clock, 0.6, 12, 250);
/** Not GO: flat. */
const flat = (clock: string) => hour(clock, 0.2, 12, 250);

const TWO_WINDOWS = [
  go('08:00'),
  go('09:00'),
  flat('10:00'),
  flat('11:00'),
  flat('12:00'),
  flat('13:00'),
  go('14:00'),
  go('15:00'),
];

function at(localClock: string): number {
  const [hours = '0', minutes = '0'] = localClock.split(':');
  return Date.parse(utc(`${hours}:00`)) + Number(minutes) * 60_000;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('The next window skips one that has already ended', ({ Given, When, Then }) => {
    let hours: HourlyConditions[] = [];
    let window: GoodWindow | undefined;
    Given('GO hours at 08:00 to 09:00 and at 14:00 to 15:00 Donabate time', () => {
      hours = TWO_WINDOWS;
    });
    When('I ask for the next window at 11:00', () => {
      window = nextGoodWindow(hours, spot, at('11:00'));
    });
    Then('the next window starts at 14:00', () => {
      expect(window?.start).toBe(utc('14:00'));
    });
  });

  Scenario('A window in progress is still the next window', ({ Given, When, Then }) => {
    let hours: HourlyConditions[] = [];
    let window: GoodWindow | undefined;
    Given('GO hours at 08:00 to 09:00 and at 14:00 to 15:00 Donabate time', () => {
      hours = TWO_WINDOWS;
    });
    When('I ask for the next window at 09:30', () => {
      window = nextGoodWindow(hours, spot, at('09:30'));
    });
    Then('the next window starts at 08:00', () => {
      expect(window?.start).toBe(utc('08:00'));
    });
  });

  Scenario('A day of only blown-out hours is summarised as blown', ({ Given, When, Then }) => {
    let hours: HourlyConditions[] = [];
    let days: DailySummary[] = [];
    Given('four hours of 0.8m waves under a 40km/h onshore wind', () => {
      hours = ['10:00', '11:00', '12:00', '13:00'].map((clock) => hour(clock, 0.8, 40, 90));
    });
    When('I summarise the days', () => {
      days = summarizeDays(hours, spot);
    });
    Then("the day's verdict is blown", () => {
      expect(days.map((day) => day.verdict)).toEqual(['blown']);
    });
  });

  Scenario('A winter evening GO window stops at sunset', ({ Given, When, Then }) => {
    let hours: HourlyConditions[] = [];
    let windows: GoodWindow[] = [];
    Given('GO conditions from 14:00 to 19:00 at Donabate on 21 December', () => {
      // Ireland is on UTC in December.
      hours = [14, 15, 16, 17, 18, 19].map((clock) => ({
        ...go('12:00'),
        time: `2026-12-21T${clock}:00:00Z`,
      }));
    });
    When('I look for good windows', () => {
      windows = findGoodWindows(hours, spot);
    });
    Then('the only window runs from 14:00 to the 15:00 hour', () => {
      expect(windows.map((window) => [window.start, window.end])).toEqual([
        ['2026-12-21T14:00:00Z', '2026-12-21T15:00:00Z'],
      ]);
    });
  });
});
