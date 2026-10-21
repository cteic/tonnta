import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { Verdict } from '@tonnta/types';

import type { BandSpec, PosterInks, PosterLayout } from './poster-scene';
import {
  POSTER_HEADLINE,
  bandLayout,
  bandLift,
  driftDuration,
  posterInks,
  posterLayout,
} from './poster-scene';

const feature = await loadFeature('./poster.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A GO day prints the sunny inks', ({ Given, When, Then }) => {
    let verdict: Verdict = 'go';
    let inks: PosterInks | undefined;

    Given('a go verdict', () => {
      verdict = 'go';
    });
    When('I pick the poster inks', () => {
      inks = posterInks(verdict);
    });
    Then('the sun ink is the warm orange', () => {
      expect(inks?.sun).toBe('#E2593B');
      expect(inks?.stock).toBe('#F4E9D3');
    });
  });

  Scenario('A blown-out day shifts to wet-day inks', ({ Given, When, Then }) => {
    let verdict: Verdict = 'go';
    let inks: PosterInks | undefined;

    Given('a blown verdict', () => {
      verdict = 'blown';
    });
    When('I pick the poster inks', () => {
      inks = posterInks(verdict);
    });
    Then('the sun ink is grey-green', () => {
      expect(inks?.sun).toBe('#8E9B8C');
      expect(inks?.sun).not.toBe(posterInks('go').sun);
    });
  });

  Scenario('Every verdict has an Irish headline', ({ Given, When, Then }) => {
    const verdicts: Verdict[] = ['go', 'maybe', 'flat', 'blown'];
    let headlines: string[] = [];

    Given('the four verdicts', () => {
      expect(verdicts).toHaveLength(4);
    });
    When('I read the headlines', () => {
      headlines = verdicts.map((verdict) => POSTER_HEADLINE[verdict]);
    });
    Then('go reads TÉIGH! and blown reads SÉIDTE', () => {
      expect(POSTER_HEADLINE.go).toBe('TÉIGH!');
      expect(POSTER_HEADLINE.blown).toBe('SÉIDTE');
      expect(new Set(headlines).size).toBe(4);
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

    Given('a go afternoon at half a metre', () => {
      // input built below
    });
    When('I compute the export layout', () => {
      layout = posterLayout({
        verdict: 'go',
        boardLabel: 'Longboard day',
        reason: '0.5m at 5s and the wind is clean — worth going down.',
        waveHeightM: 0.5,
        windState: 'cross-off',
        dateLabel: '08.07.2026',
        spotLine: 'DOMHNACH BAT',
      });
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

  Scenario('Long Irish headlines set smaller', ({ Given, When, Then }) => {
    let layout: PosterLayout | undefined;

    Given('a maybe verdict', () => {
      // B'FHÉIDIR is longer than TÉIGH!
    });
    When('I compute the export layout', () => {
      layout = posterLayout({
        verdict: 'maybe',
        reason: '0.5m showing but the wind is up.',
        waveHeightM: 0.5,
        windState: 'cross-on',
        dateLabel: '08.07.2026',
        spotLine: 'DOMHNACH BAT',
      });
    });
    Then('the headline size is reduced', () => {
      expect(layout?.headline.sizePx).toBe(168);
      expect(layout?.headline.text).toBe(POSTER_HEADLINE.maybe);
    });
  });
});
