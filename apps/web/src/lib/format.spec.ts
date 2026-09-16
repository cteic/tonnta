import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { formatWindowRange } from './format';

const feature = await loadFeature('./format.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A multi-hour window shows start and end', ({ Given, When, Then }) => {
    let start = '';
    let end = '';
    let result = '';

    Given('a window from 08:00 to 11:00 UTC', () => {
      start = '2026-07-09T08:00:00Z';
      end = '2026-07-09T11:00:00Z';
    });
    When('I format the window range for Dublin', () => {
      result = formatWindowRange(start, end, 'Europe/Dublin');
    });
    Then('I see both times joined by a dash', () => {
      expect(result).toContain('–');
      expect(result.split('–')).toHaveLength(2);
    });
  });

  Scenario('A single-hour window shows one time only', ({ Given, When, Then }) => {
    let start = '';
    let end = '';
    let result = '';

    Given('a window from 21:00 to 21:00 UTC', () => {
      start = '2026-07-09T21:00:00Z';
      end = '2026-07-09T21:00:00Z';
    });
    When('I format the window range for Dublin', () => {
      result = formatWindowRange(start, end, 'Europe/Dublin');
    });
    Then('I see a single time with no dash', () => {
      expect(result).not.toContain('–');
      expect(result).toBe('22:00');
    });
  });
});
