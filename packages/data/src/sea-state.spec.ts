import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { HourlyConditions, WindState } from '@tonnta/types';

import { seaStateFor } from './sea-state';

const feature = await loadFeature('./sea-state.feature');

function hourWith(
  waveHeightM: number,
  windState: WindState,
  windSpeedKmh: number
): HourlyConditions {
  return {
    time: '2026-07-04T12:00:00Z',
    waveHeightM,
    wavePeriodS: 7,
    waveDirectionDeg: 70,
    windSpeedKmh,
    windGustKmh: windSpeedKmh + 5,
    windDirectionDeg: windState === 'offshore' ? 250 : 70,
    windState,
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Small waves read Flat whatever the wind', ({ Given, Then }) => {
    let hour: HourlyConditions;
    Given('waves of 0.2m and onshore wind at 30km/h', () => {
      hour = hourWith(0.2, 'onshore', 30);
    });
    Then('the sea-state word is "Flat"', () => {
      expect(seaStateFor(hour)).toEqual({ word: 'Flat', rule: 'waves under 0.3m' });
    });
  });

  Scenario('Light wind reads Glassy', ({ Given, Then }) => {
    let hour: HourlyConditions;
    Given('waves of 0.6m and onshore wind at 6km/h', () => {
      hour = hourWith(0.6, 'onshore', 6);
    });
    Then('the sea-state word is "Glassy"', () => {
      expect(seaStateFor(hour)?.word).toBe('Glassy');
    });
  });

  Scenario('Offshore wind under 30km/h reads Clean', ({ Given, Then }) => {
    let hour: HourlyConditions;
    Given('waves of 0.6m and offshore wind at 20km/h', () => {
      hour = hourWith(0.6, 'offshore', 20);
    });
    Then('the sea-state word is "Clean"', () => {
      expect(seaStateFor(hour)?.word).toBe('Clean');
    });
  });

  Scenario('Onshore wind at 15km/h or more reads Choppy', ({ Given, Then }) => {
    let hour: HourlyConditions;
    Given('waves of 0.6m and onshore wind at 15km/h', () => {
      hour = hourWith(0.6, 'onshore', 15);
    });
    Then('the sea-state word is "Choppy"', () => {
      expect(seaStateFor(hour)?.word).toBe('Choppy');
    });
  });

  Scenario('No rule fits, so there is no word', ({ Given, Then }) => {
    let hour: HourlyConditions;
    Given('waves of 0.6m and onshore wind at 12km/h', () => {
      hour = hourWith(0.6, 'onshore', 12);
    });
    Then('there is no sea-state word', () => {
      expect(seaStateFor(hour)).toBeUndefined();
    });
  });

  Scenario('Strong offshore wind gets no word', ({ Given, Then }) => {
    let hour: HourlyConditions;
    Given('waves of 0.6m and offshore wind at 30km/h', () => {
      hour = hourWith(0.6, 'offshore', 30);
    });
    Then('there is no sea-state word', () => {
      expect(seaStateFor(hour)).toBeUndefined();
    });
  });

  Scenario('The rule reads the wind as the page prints it', ({ Given, Then }) => {
    let hour: HourlyConditions;
    Given('waves of 0.6m and onshore wind at 14.6km/h', () => {
      hour = hourWith(0.6, 'onshore', 14.6);
    });
    Then('the sea-state word is "Choppy"', () => {
      expect(seaStateFor(hour)?.word).toBe('Choppy');
    });
  });

  Scenario('A glassy wind label always reads Glassy', ({ Given, Then }) => {
    let hour: HourlyConditions;
    Given('waves of 0.6m and a glassy wind at 7.6km/h', () => {
      hour = hourWith(0.6, 'glassy', 7.6);
    });
    Then('the sea-state word is "Glassy"', () => {
      expect(seaStateFor(hour)?.word).toBe('Glassy');
    });
  });

  Scenario('A missing value gets no word', ({ Given, Then }) => {
    let hour: HourlyConditions;
    Given('waves of an unknown height and offshore wind at 20km/h', () => {
      hour = hourWith(Number.NaN, 'offshore', 20);
    });
    Then('there is no sea-state word', () => {
      expect(seaStateFor(hour)).toBeUndefined();
    });
  });
});
