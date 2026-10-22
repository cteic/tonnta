import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { SunTimes } from './daylight';
import { isDaylightHour, sunTimes } from './daylight';
import { getSpot } from './spots';

const feature = await loadFeature('./daylight.feature');

const donabate = getSpot('donabate');
if (donabate === undefined) {
  throw new Error('Donabate spot missing from registry');
}
const spot = donabate;

const THREE_MINUTES_MS = 3 * 60 * 1000;

describeFeature(feature, ({ Scenario }) => {
  Scenario('Sunrise and sunset at Donabate on the shortest day', ({ When, Then }) => {
    let times: SunTimes = { allDay: false };
    When('I work out the sun times at Donabate for 21 December 2026', () => {
      times = sunTimes(Date.parse('2026-12-21T12:00:00Z'), spot.latitude, spot.longitude);
    });
    Then(
      'the sun rises within three minutes of 08:38 and sets within three minutes of 16:08',
      () => {
        // Ireland is on UTC in December.
        const rise = Math.abs((times.sunrise ?? 0) - Date.parse('2026-12-21T08:38:00Z'));
        const set = Math.abs((times.sunset ?? 0) - Date.parse('2026-12-21T16:08:00Z'));
        expect(rise).toBeLessThan(THREE_MINUTES_MS);
        expect(set).toBeLessThan(THREE_MINUTES_MS);
      }
    );
  });

  Scenario(
    'A December hour counts only if its middle is between sunrise and sunset',
    ({ Given, Then, And }) => {
      const at = (clock: string) => `2026-12-21T${clock}:00Z`;
      Given(
        'Donabate on 21 December 2026, when the sun rises at about 08:38 and sets at about 16:06',
        () => {
          // Ireland is on UTC in December, so the clock times are UTC.
        }
      );
      Then('the 08:00 and 16:00 hours are dark', () => {
        expect(isDaylightHour(at('08:00'), spot)).toBe(false);
        expect(isDaylightHour(at('16:00'), spot)).toBe(false);
      });
      And('the 09:00 and 15:00 hours are light', () => {
        expect(isDaylightHour(at('09:00'), spot)).toBe(true);
        expect(isDaylightHour(at('15:00'), spot)).toBe(true);
      });
    }
  );

  Scenario('A midsummer evening stays light until about ten', ({ Given, Then, And }) => {
    Given('Donabate on 21 June 2026, when the sun sets at about 21:57 Irish time', () => {
      // Irish summer time is UTC+1, so 21:00 Irish time is 20:00 UTC.
    });
    Then('the 21:00 Irish-time hour is light', () => {
      expect(isDaylightHour('2026-06-21T20:00:00Z', spot)).toBe(true);
    });
    And('the 22:00 Irish-time hour is dark', () => {
      expect(isDaylightHour('2026-06-21T21:00:00Z', spot)).toBe(false);
    });
  });
});
