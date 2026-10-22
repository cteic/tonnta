import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { HourlyConditions } from '@tonnta/types';

import { isThunderstorm, seaTempBand } from './weather';

const feature = await loadFeature('./weather.feature');

function withCode(weatherCode: number): HourlyConditions {
  return {
    time: '2026-07-04T12:00:00Z',
    waveHeightM: 0.5,
    wavePeriodS: 5,
    waveDirectionDeg: 90,
    windSpeedKmh: 10,
    windGustKmh: 14,
    windDirectionDeg: 250,
    windState: 'offshore',
    weatherCode,
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Thunderstorm codes are recognised', ({ Then }) => {
    Then('weather codes 95, 96 and 99 are thunderstorms and 3 and 61 are not', () => {
      expect([95, 96, 99, 3, 61].map((code) => isThunderstorm(withCode(code)))).toEqual([
        true,
        true,
        true,
        false,
        false,
      ]);
    });
  });

  Scenario('Sea temperature bands give advice for an Irish beach', ({ Then }) => {
    Then('8°C is baltic, 11°C is bracing, 14°C is fresh, 17°C is mild and 20°C is warm', () => {
      expect([8, 11, 14, 17, 20].map((c) => seaTempBand(c).band)).toEqual([
        'baltic',
        'bracing',
        'fresh',
        'mild',
        'warm',
      ]);
    });
  });
});
