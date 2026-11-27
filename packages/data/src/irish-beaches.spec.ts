import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { HourlyConditions, Spot, VerdictResult, WindState } from '@tonnta/types';

import { BATHING_WATERS } from './bathing-waters';
import { SPOTS, getSpot } from './spots';
import { assessHour, classifyWind } from './verdict';

const feature = await loadFeature('./irish-beaches.feature');

const IRISH = SPOTS.filter((spot) => spot.country === 'IE');

function spotOrThrow(id: string): Spot {
  const spot = getSpot(id);
  if (spot === undefined) throw new Error(`Missing spot ${id}`);
  return spot;
}

function hourAt(spot: Spot, waveHeightM: number, wavePeriodS: number): HourlyConditions {
  const offshoreFrom = (spot.facing + 180) % 360;
  return {
    time: '2026-11-28T12:00:00Z',
    waveHeightM,
    wavePeriodS,
    waveDirectionDeg: spot.facing,
    windSpeedKmh: 15,
    windGustKmh: 20,
    windDirectionDeg: offshoreFrom,
    windState: 'offshore',
  };
}

describeFeature(feature, ({ ScenarioOutline, Scenario }) => {
  ScenarioOutline(
    "The guide's best wind reads as offshore at <beach>",
    ({ Given, When, Then }, variables) => {
      let spot: Spot;
      let wind: WindState;
      Given('the beach <beach>', () => {
        spot = spotOrThrow(variables.beach);
      });
      When('a 15 km/h wind blows from <bestWind> degrees', () => {
        wind = classifyWind(Number(variables.bestWind), 15, spot);
      });
      Then('the app calls the wind offshore or cross-offshore', () => {
        expect(['offshore', 'cross-off']).toContain(wind);
      });
    }
  );

  Scenario('Every Irish beach links to a real EPA bathing water or to none', ({ Given, Then }) => {
    let ids: string[] = [];
    Given('every Irish beach in the registry', () => {
      ids = IRISH.flatMap((spot) => (spot.epaBeachId === undefined ? [] : [spot.epaBeachId]));
    });
    Then('each EPA id names a bathing water in the EPA list', () => {
      const known = new Set(BATHING_WATERS.map((water) => water.id));
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.filter((id) => !known.has(id))).toEqual([]);
    });
  });

  Scenario('No Irish beach relies on the offline north-west buoy', ({ Given, Then }) => {
    let buoys: (string | undefined)[] = [];
    Given('every Irish beach in the registry', () => {
      buoys = IRISH.map((spot) => spot.buoyStationId);
    });
    Then('none uses buoy M4', () => {
      expect(buoys).not.toContain('M4');
    });
  });

  Scenario('Mullaghmore Head is not rated good on an ordinary swell', ({ Given, When, Then }) => {
    let spot: Spot;
    let result: VerdictResult;
    Given('Mullaghmore Head with a clean 15 km/h offshore wind', () => {
      spot = spotOrThrow('mullaghmore-head');
    });
    When('the swell is 1.5 m at 12 s', () => {
      result = assessHour(hourAt(spot, 1.5, 12), spot);
    });
    Then('it is not rated good', () => {
      expect(result.verdict).not.toBe('go');
    });
    When('the swell is 3.5 m at 14 s', () => {
      result = assessHour(hourAt(spot, 3.5, 14), spot);
    });
    Then('it is rated good', () => {
      expect(result.verdict).toBe('go');
    });
  });
});
