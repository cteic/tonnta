import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { currentHourOf } from './current-hour';

const feature = await loadFeature('./current-hour.feature');

const DAY = '2026-10-22';

function at(clock: string): string {
  return `${DAY}T${clock}:00Z`;
}

describeFeature(feature, ({ Scenario }) => {
  let hours: { time: string }[] = [];
  let picked: { time: string } | undefined;

  function givenRange(): void {
    hours = ['10:00', '11:00', '12:00', '13:00'].map((clock) => ({ time: at(clock) }));
  }

  Scenario('Mid-hour, the hour in progress is current', ({ Given, When, Then }) => {
    Given('forecast hours from 10:00 to 13:00 UTC', givenRange);
    When('it is 10:40 UTC', () => {
      picked = currentHourOf(hours, Date.parse(at('10:40')));
    });
    Then('the current hour is 10:00 UTC', () => {
      expect(picked?.time).toBe(at('10:00'));
    });
  });

  Scenario('On the hour, that hour is current', ({ Given, When, Then }) => {
    Given('forecast hours from 10:00 to 13:00 UTC', givenRange);
    When('it is 11:00 UTC', () => {
      picked = currentHourOf(hours, Date.parse(at('11:00')));
    });
    Then('the current hour is 11:00 UTC', () => {
      expect(picked?.time).toBe(at('11:00'));
    });
  });

  Scenario('Before the forecast starts, the first hour is current', ({ Given, When, Then }) => {
    Given('forecast hours from 10:00 to 13:00 UTC', givenRange);
    When('it is 09:15 UTC', () => {
      picked = currentHourOf(hours, Date.parse(at('09:15')));
    });
    Then('the current hour is 10:00 UTC', () => {
      expect(picked?.time).toBe(at('10:00'));
    });
  });

  Scenario('Across a gap in the forecast, the next hour is current', ({ Given, When, Then }) => {
    Given('forecast hours at 10:00 and 13:00 UTC', () => {
      hours = [{ time: at('10:00') }, { time: at('13:00') }];
    });
    When('it is 11:30 UTC', () => {
      picked = currentHourOf(hours, Date.parse(at('11:30')));
    });
    Then('the current hour is 13:00 UTC', () => {
      expect(picked?.time).toBe(at('13:00'));
    });
  });
});
