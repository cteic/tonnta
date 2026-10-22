import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { formatHourRange } from './time-format';

const feature = await loadFeature('./time-format.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A single good hour reads as the hour it spans', ({ Then }) => {
    Then(
      'a window whose only hour starts at 18:00 UTC in late October reads "19:00–20:00" in Dublin',
      () => {
        expect(
          formatHourRange('2026-10-22T18:00:00Z', '2026-10-22T18:00:00Z', 'Europe/Dublin')
        ).toBe('19:00–20:00');
      }
    );
  });

  Scenario('A run of good hours ends when its last hour does', ({ Then }) => {
    Then('a window of hours starting 16:00 to 18:00 UTC reads "17:00–20:00" in Dublin', () => {
      expect(formatHourRange('2026-10-22T16:00:00Z', '2026-10-22T18:00:00Z', 'Europe/Dublin')).toBe(
        '17:00–20:00'
      );
    });
  });
});
