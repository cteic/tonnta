import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { BandSpec, PosterInks, PosterInput, PosterLayout } from './poster-scene';
import { bandLayout, bandLift, driftDuration, posterInks, posterLayout } from './poster-scene';

const feature = await loadFeature('./poster.feature');

const HALF_METRE: PosterInput = {
  headline: '0.5m',
  boardLabel: 'Board: Longboard',
  factsLine: '5s · wind 12km/h WSW, cross-off · gusts 18km/h · sea 14.0°C',
  waveHeightM: 0.5,
  windState: 'cross-off',
  dateLabel: '08.07.2026',
  spotLine: 'DOMHNACH BAT',
};

describeFeature(feature, ({ Scenario }) => {
  Scenario('The poster prints the same inks every day', ({ Given, When, Then }) => {
    let inks: PosterInks | undefined;

    Given('the poster', () => {
      // posterInks takes no forecast input
    });
    When('I pick the poster inks', () => {
      inks = posterInks();
    });
    Then('the sun ink is the warm orange', () => {
      expect(inks?.sun).toBe('#E2593B');
      expect(inks?.stock).toBe('#F4E9D3');
    });
  });

  Scenario('Bigger waves lift the band crests', ({ Given, When, Then }) => {
    let calm: BandSpec[] = [];
    let heavy: BandSpec[] = [];

    Given('calm and heavy wave heights', () => {
      // 0.1m vs 1.2m
    });
    When('I lay out the bands for each', () => {
      calm = bandLayout(0.1, 'cross-off');
      heavy = bandLayout(1.2, 'cross-off');
    });
    Then('every crest sits higher on the heavy day', () => {
      expect(calm).toHaveLength(4);
      for (let i = 0; i < calm.length; i += 1) {
        const calmBand = calm[i];
        const heavyBand = heavy[i];
        if (calmBand === undefined || heavyBand === undefined) {
          throw new Error('missing band');
        }
        expect(heavyBand.crest).toBeGreaterThan(calmBand.crest);
      }
    });
  });

  Scenario('Wave height is clamped to the poster range', ({ Given, When, Then }) => {
    let lift = 0;

    Given('an absurd nine metre reading', () => {
      // clamped to 1.5m
    });
    When('I compute the band lift', () => {
      lift = bandLift(9);
    });
    Then('the lift equals the maximum lift', () => {
      expect(lift).toBeCloseTo(bandLift(1.5), 10);
      expect(lift).toBeCloseTo(0.09, 10);
    });
  });

  Scenario('Onshore mess bobs faster than glass', ({ Given, When, Then }) => {
    let glassy = 0;
    let onshore = 0;

    Given('glassy and onshore wind states', () => {
      // compared below
    });
    When('I compare drift durations', () => {
      glassy = driftDuration('glassy');
      onshore = driftDuration('onshore');
    });
    Then('the onshore cycle is shorter', () => {
      expect(onshore).toBeLessThan(glassy);
    });
  });

  Scenario('The exported layout stays inside the canvas', ({ Given, When, Then }) => {
    let layout: PosterLayout | undefined;

    Given('an afternoon at half a metre', () => {
      // input built below
    });
    When('I compute the export layout', () => {
      layout = posterLayout(HALF_METRE);
    });
    Then('every band and text baseline sits within 1080 by 1920', () => {
      if (layout === undefined) throw new Error('no layout');
      expect(layout.width).toBe(1080);
      expect(layout.height).toBe(1920);
      for (const band of layout.bands) {
        expect(band.yTop).toBeGreaterThan(0);
        expect(band.yTop).toBeLessThan(1920);
      }
      expect(layout.headline.y).toBeGreaterThan(layout.sun.cy);
      expect(layout.stamp.y).toBeLessThan(1920);
    });
  });

  Scenario('The headline is the wave height, not a verdict', ({ Given, When, Then, And }) => {
    let layout: PosterLayout | undefined;

    Given('an afternoon at half a metre', () => {
      // input built below
    });
    When('I compute the export layout', () => {
      layout = posterLayout(HALF_METRE);
    });
    Then('the headline reads the wave height', () => {
      expect(layout?.headline.text).toBe('0.5M');
    });
    And('the board line reads as a plain tag', () => {
      expect(layout?.subline.text).toBe('BOARD: LONGBOARD');
    });
  });
});
