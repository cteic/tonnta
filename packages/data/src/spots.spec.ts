import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { HourlyConditions, Spot, VerdictResult } from '@tonnta/types';

import { getSpot } from './spots';
import { assessHour, classifyWind, spotThresholds } from './verdict';

const feature = await loadFeature('./spots.feature');

function requireSpot(id: string): Spot {
  const spot = getSpot(id);
  if (spot === undefined) {
    throw new Error(`missing spot ${id}`);
  }
  return spot;
}

function offshoreHour(spot: Spot, waveHeightM: number): HourlyConditions {
  const windDirectionDeg = (spot.facing + 180) % 360;
  return {
    time: '2026-07-09T10:00:00Z',
    waveHeightM,
    wavePeriodS: 6,
    waveDirectionDeg: spot.facing,
    windSpeedKmh: 12,
    windGustKmh: 16,
    windDirectionDeg,
    windState: classifyWind(windDirectionDeg, 12, spot),
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Fuerteventura spots resolve from the registry', ({ Given, When, Then }) => {
    let id = '';
    let spot: Spot | undefined;

    Given('the spot id el-cotillo', () => {
      id = 'el-cotillo';
    });
    When('I look it up in the registry', () => {
      spot = getSpot(id);
    });
    Then('I get El Cotillo in the Atlantic/Canary timezone', () => {
      expect(spot?.name).toBe('El Cotillo');
      expect(spot?.timezone).toBe('Atlantic/Canary');
      expect(spot?.country).toBe('ES');
    });
  });

  Scenario('An unknown spot id resolves to nothing', ({ Given, When, Then }) => {
    let id = '';
    let spot: Spot | undefined;

    Given('the spot id atlantis', () => {
      id = 'atlantis';
    });
    When('I look it up in the registry', () => {
      spot = getSpot(id);
    });
    Then('no spot is found', () => {
      expect(spot).toBeUndefined();
    });
  });

  Scenario('Half a metre is a go at Donabate', ({ Given, When, Then }) => {
    let result: VerdictResult | undefined;

    Given('0.5m waves at 6s with 12km/h offshore wind', () => {
      // hour built per spot in the When step
    });
    When('I assess the hour at Donabate', () => {
      const spot = requireSpot('donabate');
      result = assessHour(offshoreHour(spot, 0.5), spot);
    });
    Then('the verdict should be go', () => {
      expect(result?.verdict).toBe('go');
    });
  });

  Scenario('Half a metre is flat at El Cotillo', ({ Given, When, Then }) => {
    let result: VerdictResult | undefined;

    Given('0.5m waves at 6s with 12km/h offshore wind', () => {
      // hour built per spot in the When step
    });
    When('I assess the hour at El Cotillo', () => {
      const spot = requireSpot('el-cotillo');
      result = assessHour(offshoreHour(spot, 0.5), spot);
    });
    Then('the verdict should be flat', () => {
      expect(result?.verdict).toBe('flat');
    });
  });

  Scenario('A spot without its own thresholds uses the defaults', ({ Given, When, Then }) => {
    let spot: Spot | undefined;
    let goFromM = 0;

    Given('the spot id donabate', () => {
      spot = getSpot('donabate');
    });
    When('I resolve its thresholds', () => {
      if (spot === undefined) throw new Error('spot missing');
      goFromM = spotThresholds(spot).goFromM;
    });
    Then('the go-from threshold is 0.4m', () => {
      expect(goFromM).toBe(0.4);
    });
  });

  Scenario('A Fuerteventura spot carries its own thresholds', ({ Given, When, Then }) => {
    let spot: Spot | undefined;
    let goFromM = 0;

    Given('the spot id el-cotillo', () => {
      spot = getSpot('el-cotillo');
    });
    When('I resolve its thresholds', () => {
      if (spot === undefined) throw new Error('spot missing');
      goFromM = spotThresholds(spot).goFromM;
    });
    Then('the go-from threshold is 0.8m', () => {
      expect(goFromM).toBe(0.8);
    });
  });
});
