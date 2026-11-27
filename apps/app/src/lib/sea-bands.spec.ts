import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { HourlyConditions } from '@tonnta/types';

import { seaBandPath, seaBands } from './sea-bands';

const feature = await loadFeature('./sea-bands.feature');

function hour(overrides: Partial<HourlyConditions>): HourlyConditions {
  return {
    time: '2026-11-28T12:00:00Z',
    waveHeightM: 0.8,
    wavePeriodS: 7,
    waveDirectionDeg: 90,
    windSpeedKmh: 10,
    windDirectionDeg: 270,
    windGustKmh: 15,
    windState: 'offshore',
    ...overrides,
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Messy onshore seas drift faster and shorter than glassy ones', ({ Given, Then }) => {
    let messy: ReturnType<typeof seaBands>;
    let glassy: ReturnType<typeof seaBands>;
    Given('a 0.8 m sea with 30 km/h onshore wind and a 0.8 m sea with no wind', () => {
      messy = seaBands(hour({ windSpeedKmh: 30, windState: 'onshore' }));
      glassy = seaBands(hour({ windSpeedKmh: 2, windState: 'glassy' }));
    });
    Then('the onshore bands are shorter and drift faster', () => {
      messy.forEach((band, index) => {
        const calm = glassy[index];
        if (calm === undefined) throw new Error('Expected matching bands');
        expect(band.wavelength).toBeLessThan(calm.wavelength);
        expect(band.wavelength / band.cycleS).toBeGreaterThan(calm.wavelength / calm.cycleS);
      });
    });
  });

  Scenario('Band height follows the waves within limits', ({ Given, Then }) => {
    let ripple: ReturnType<typeof seaBands>;
    let swell: ReturnType<typeof seaBands>;
    Given('a 0.05 m ripple and a 3 m swell', () => {
      ripple = seaBands(hour({ waveHeightM: 0.05 }));
      swell = seaBands(hour({ waveHeightM: 3 }));
    });
    Then('the ripple band keeps a visible minimum height and the swell band is capped', () => {
      expect(ripple[2]?.amplitude).toBe(3);
      expect(swell[2]?.amplitude).toBe(26);
    });
  });

  Scenario('A band path repeats once per wavelength', ({ Given, Then }) => {
    let path = '';
    Given('a band 220 points long drawn 440 points wide', () => {
      path = seaBandPath({ amplitude: 10, wavelength: 220 }, 440, 80, 120);
    });
    Then('the path holds two full waves and closes at the bottom', () => {
      expect(path.match(/q /g)).toHaveLength(4);
      expect(path.startsWith('M0 80')).toBe(true);
      expect(path.endsWith('V 120 H 0 Z')).toBe(true);
    });
  });
});
