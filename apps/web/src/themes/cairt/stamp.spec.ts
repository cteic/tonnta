import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { Verdict } from '@tonnta/types';

import type { StampTreatment } from './stamp';
import { stampTreatment } from './stamp';

const feature = await loadFeature('./stamp.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('GO is stamped in notice magenta', ({ Given, When, Then, And }) => {
    let verdict: Verdict = 'go';
    let treatment: StampTreatment | undefined;

    Given('a go verdict', () => {
      verdict = 'go';
    });
    When('I resolve the stamp treatment', () => {
      treatment = stampTreatment(verdict);
    });
    Then('the stamp ink is notice magenta', () => {
      expect(treatment?.ink).toBe('#B8266B');
    });
    And('the stamp is not barred', () => {
      expect(treatment?.barred).toBe(false);
    });
  });

  Scenario('MAYBE is stamped in sounding ink with no fill', ({ Given, When, Then, And }) => {
    let verdict: Verdict = 'maybe';
    let treatment: StampTreatment | undefined;

    Given('a maybe verdict', () => {
      verdict = 'maybe';
    });
    When('I resolve the stamp treatment', () => {
      treatment = stampTreatment(verdict);
    });
    Then('the stamp ink is sounding ink', () => {
      expect(treatment?.ink).toBe('#12333E');
    });
    And('the stamp fill is transparent', () => {
      expect(treatment?.fill).toBe('transparent');
    });
  });

  Scenario('FLAT is stamped in contour grey', ({ Given, When, Then, And }) => {
    let verdict: Verdict = 'flat';
    let treatment: StampTreatment | undefined;

    Given('a flat verdict', () => {
      verdict = 'flat';
    });
    When('I resolve the stamp treatment', () => {
      treatment = stampTreatment(verdict);
    });
    Then('the stamp ink is contour grey', () => {
      expect(treatment?.ink).toBe('#7A97A1');
    });
    And('the stamp is not barred', () => {
      expect(treatment?.barred).toBe(false);
    });
  });

  Scenario('BLOWN gets the prohibited-anchorage bar', ({ Given, When, Then, And }) => {
    let verdict: Verdict = 'blown';
    let treatment: StampTreatment | undefined;

    Given('a blown verdict', () => {
      verdict = 'blown';
    });
    When('I resolve the stamp treatment', () => {
      treatment = stampTreatment(verdict);
    });
    Then('the stamp is barred', () => {
      expect(treatment?.barred).toBe(true);
    });
    And('the stamp ink is warning rust', () => {
      expect(treatment?.ink).toBe('#B3401F');
    });
  });
});
