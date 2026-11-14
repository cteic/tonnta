import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  Board,
  HourlyConditions,
  Spot,
  Verdict,
  VerdictResult,
  WindState,
} from '@tonnta/types';

import { getSpot } from './spots';
import { assessHour, classifyWind } from './verdict';

const feature = await loadFeature('./verdict.feature');

const donabate = getSpot('donabate');
if (donabate === undefined) {
  throw new Error('Donabate spot missing from registry');
}
const spot: Spot = donabate;

const WIND_FROM: Record<string, number> = {
  'west-southwest': 250,
  west: 270,
  east: 90,
  north: 0,
};

function hourWith(
  waveHeightM: number,
  wavePeriodS: number,
  windSpeedKmh: number,
  windFrom: string
): HourlyConditions {
  const windDirectionDeg = WIND_FROM[windFrom] ?? 0;
  return {
    time: '2026-07-04T10:00:00Z',
    waveHeightM,
    wavePeriodS,
    waveDirectionDeg: 90,
    windSpeedKmh,
    windGustKmh: windSpeedKmh * 1.3,
    windDirectionDeg,
    windState: classifyWind(windDirectionDeg, windSpeedKmh, spot),
  };
}

interface AssessCase {
  title: string;
  given: string;
  hour: [number, number, number, string];
  verdict: Verdict;
  board?: Board;
}

const ASSESS_CASES: AssessCase[] = [
  {
    title: 'Clean waves over the go threshold with light offshore wind is a GO',
    given: '0.6m waves at 5s with 12km/h wind from the west-southwest',
    hour: [0.6, 5, 12, 'west-southwest'],
    verdict: 'go',
    board: 'longboard',
  },
  {
    title: 'Rideable waves with strong onshore wind is blown out',
    given: '0.8m waves at 4s with 40km/h wind from the east',
    hour: [0.8, 4, 40, 'east'],
    verdict: 'blown',
  },
  {
    title: 'Under 0.3m is flat',
    given: '0.2m waves at 3s with 20km/h wind from the west',
    hour: [0.2, 3, 20, 'west'],
    verdict: 'flat',
  },
  {
    title: 'Flat and glassy recommends the SUP',
    given: '0.2m waves at 3s with 5km/h wind from the west',
    hour: [0.2, 3, 5, 'west'],
    verdict: 'flat',
    board: 'sup',
  },
  {
    title: 'Waves at threshold with marginal wind is a maybe',
    given: '0.5m waves at 4s with 28km/h wind from the north',
    hour: [0.5, 4, 28, 'north'],
    verdict: 'maybe',
  },
  {
    title: 'Offshore wind earns the higher wind allowance',
    given: '0.5m waves at 4s with 28km/h wind from the west-southwest',
    hour: [0.5, 4, 28, 'west-southwest'],
    verdict: 'go',
  },
  {
    title: 'Small rideable waves pick the foamie',
    given: '0.45m waves at 4s with 15km/h wind from the west-southwest',
    hour: [0.45, 4, 15, 'west-southwest'],
    verdict: 'go',
    board: 'foamie',
  },
];

interface ClassifyCase {
  title: string;
  given: string;
  speedKmh: number;
  directionDeg: number;
  expected: WindState;
}

const CLASSIFY_CASES: ClassifyCase[] = [
  {
    title: 'Wind from the west-southwest is offshore at Donabate',
    given: 'a 12km/h wind from 250 degrees',
    speedKmh: 12,
    directionDeg: 250,
    expected: 'offshore',
  },
  {
    title: 'Wind from the east-northeast is onshore at Donabate',
    given: 'a 25km/h wind from 70 degrees',
    speedKmh: 25,
    directionDeg: 70,
    expected: 'onshore',
  },
  {
    title: 'Wind under 8km/h is glassy regardless of direction',
    given: 'a 5km/h wind from 70 degrees',
    speedKmh: 5,
    directionDeg: 70,
    expected: 'glassy',
  },
];

describeFeature(feature, ({ Scenario }) => {
  for (const testCase of ASSESS_CASES) {
    Scenario(testCase.title, ({ Given, When, Then, And }) => {
      let hour: HourlyConditions | undefined;
      let result: VerdictResult | undefined;

      Given(testCase.given, () => {
        const [wave, period, wind, from] = testCase.hour;
        hour = hourWith(wave, period, wind, from);
      });
      When('I assess the hour for Donabate', () => {
        if (hour === undefined) throw new Error('no hour set');
        result = assessHour(hour, spot);
      });
      Then(`the verdict should be ${testCase.verdict}`, () => {
        expect(result?.verdict).toBe(testCase.verdict);
      });
      if (testCase.board !== undefined) {
        const board = testCase.board;
        And(`the board should be ${board}`, () => {
          expect(result?.board).toBe(board);
        });
      }
    });
  }

  for (const testCase of CLASSIFY_CASES) {
    Scenario(testCase.title, ({ Given, When, Then }) => {
      let state: WindState | undefined;

      Given(testCase.given, () => {
        // inputs come from the case table
      });
      When('I classify the wind for Donabate', () => {
        state = classifyWind(testCase.directionDeg, testCase.speedKmh, spot);
      });
      Then(`the wind state should be ${testCase.expected}`, () => {
        expect(state).toBe(testCase.expected);
      });
    });
  }

  Scenario("A spot's own flat threshold names its own height", ({ Given, When, Then }) => {
    const elCotillo = getSpot('el-cotillo');
    let hour: HourlyConditions | undefined;
    let result: VerdictResult | undefined;

    Given('0.5m waves at 4s with 12km/h wind at El Cotillo, which goes flat below 0.6m', () => {
      hour = hourWith(0.5, 4, 12, 'north');
    });
    When('I assess the hour for El Cotillo', () => {
      if (elCotillo === undefined || hour === undefined) throw new Error('fixture missing');
      result = assessHour(hour, elCotillo);
    });
    Then('the verdict should be flat because it is under 0.6m', () => {
      expect(result?.verdict).toBe('flat');
      expect(result?.reason).toContain('Under 0.6m');
    });
  });
});
