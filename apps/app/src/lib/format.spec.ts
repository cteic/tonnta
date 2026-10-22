import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { formatHourRange } from './format';

const feature = await loadFeature('./format.feature');

const DUBLIN = 'Europe/Dublin';

describeFeature(feature, ({ Scenario }) => {
  Scenario('A single good hour reads as the hour it spans', ({ Given, When, Then }) => {
    let first = '';
    let last = '';
    let label = '';
    Given('a window whose only good hour starts at 18:00 UTC in late October', () => {
      first = '2026-10-22T18:00:00Z';
      last = first;
    });
    When('it is formatted for Dublin', () => {
      label = formatHourRange(first, last, DUBLIN);
    });
    Then('it reads "19:00–20:00"', () => {
      expect(label).toBe('19:00–20:00');
    });
  });

  Scenario('A run of good hours ends when its last hour does', ({ Given, When, Then }) => {
    let first = '';
    let last = '';
    let label = '';
    Given('a window of good hours starting at 16:00 and 18:00 UTC', () => {
      first = '2026-10-22T16:00:00Z';
      last = '2026-10-22T18:00:00Z';
    });
    When('it is formatted for Dublin', () => {
      label = formatHourRange(first, last, DUBLIN);
    });
    Then('it reads "17:00–20:00"', () => {
      expect(label).toBe('17:00–20:00');
    });
  });
});
