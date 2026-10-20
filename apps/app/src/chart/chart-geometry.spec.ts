import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { Verdict } from '@tonnta/types';

import type { ChartHour } from '../lib/conditions';
import type { ChartBox, ChartGeometry } from './chart-geometry';
import { buildChartGeometry, hourIndexAt, longestGoRun } from './chart-geometry';

const feature = await loadFeature('./chart-geometry.feature');

const START = Date.parse('2026-10-20T17:00:00Z');
const HOUR_MS = 60 * 60 * 1000;
const VERDICTS: Verdict[] = ['go', 'maybe', 'flat', 'blown'];
const BOX: ChartBox = { width: 248, height: 168, top: 4, right: 4, bottom: 4, left: 4 };

function hourAt(index: number, overrides: Partial<ChartHour> = {}): ChartHour {
  return {
    time: new Date(START + index * HOUR_MS).toISOString(),
    waveHeightM: 0.4 + (index % 6) * 0.1,
    windSpeedKmh: 10 + index,
    verdict: VERDICTS[index % VERDICTS.length] ?? 'go',
    ...overrides,
  };
}

const day = (): ChartHour[] => Array.from({ length: 24 }, (_, index) => hourAt(index));

describeFeature(feature, ({ Scenario }) => {
  Scenario('Each hour gets an equal slot coloured by its verdict', ({ Given, When, Then, And }) => {
    let hours: ChartHour[] = [];
    let geometry: ChartGeometry | undefined;
    Given('24 hours of conditions', () => {
      hours = day();
    });
    When('I lay the chart out 248 points wide with 4-point margins', () => {
      geometry = buildChartGeometry(hours, BOX);
    });
    Then('there are 24 bands, each 10 points wide', () => {
      expect(geometry?.bands).toHaveLength(24);
      expect(geometry?.bands.every((band) => band.width === 10)).toBe(true);
      expect(geometry?.bands[1]?.x).toBe(14);
    });
    And("each band carries its hour's verdict", () => {
      expect(geometry?.bands.map((band) => band.verdict)).toEqual(
        hours.map((hour) => hour.verdict)
      );
    });
  });

  Scenario(
    'The wave axis rounds up to the next half metre, never below a metre',
    ({ Given, When, Then, And }) => {
      let hours: ChartHour[] = [];
      let geometry: ChartGeometry | undefined;
      Given('hours whose biggest wave is 1.3m', () => {
        hours = [hourAt(0, { waveHeightM: 0.6 }), hourAt(1, { waveHeightM: 1.3 })];
      });
      When('I lay the chart out 248 points wide with 4-point margins', () => {
        geometry = buildChartGeometry(hours, BOX);
      });
      Then('the wave axis tops out at 1.5m', () => {
        expect(geometry?.waveMaxM).toBe(1.5);
      });
      And('on a flat day the wave axis tops out at 1m', () => {
        const flat = buildChartGeometry([hourAt(0, { waveHeightM: 0.1 })], BOX);
        expect(flat.waveMaxM).toBe(1);
        expect(flat.windMaxKmh).toBe(30);
      });
    }
  );

  Scenario('Ticks mark every sixth hour', ({ Given, When, Then }) => {
    let hours: ChartHour[] = [];
    let geometry: ChartGeometry | undefined;
    Given('24 hours of conditions', () => {
      hours = day();
    });
    When('I lay the chart out 248 points wide with 4-point margins', () => {
      geometry = buildChartGeometry(hours, BOX);
    });
    Then('there are ticks at hours 0, 6, 12 and 18', () => {
      expect(geometry?.ticks.map((tick) => tick.time)).toEqual(
        [0, 6, 12, 18].map((index) => hours[index]?.time)
      );
      expect(geometry?.ticks[0]?.x).toBe(9);
    });
  });

  Scenario('A finger anywhere in a slot selects that hour', ({ Given, Then }) => {
    let count = 0;
    Given('24 hours of conditions', () => {
      count = day().length;
    });
    Then('x 3 selects hour 0, x 125 selects hour 12 and x 400 selects hour 23', () => {
      expect(hourIndexAt(3, count, BOX)).toBe(0);
      expect(hourIndexAt(125, count, BOX)).toBe(12);
      expect(hourIndexAt(400, count, BOX)).toBe(23);
    });
  });

  Scenario('The spoken summary names the longest GO run', ({ Given, Then }) => {
    let hours: ChartHour[] = [];
    Given('hours that go GO, MAYBE, GO, GO, GO, FLAT', () => {
      const sequence: Verdict[] = ['go', 'maybe', 'go', 'go', 'go', 'flat'];
      hours = sequence.map((verdict, index) => hourAt(index, { verdict }));
    });
    Then('the longest GO run is from the third hour to the fifth', () => {
      expect(longestGoRun(hours)).toEqual({ start: hours[2]?.time, end: hours[4]?.time });
    });
  });
});
