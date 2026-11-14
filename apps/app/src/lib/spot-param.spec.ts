import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { SpotRoute } from './spot-param';
import { resolveSpotRoute } from './spot-param';

const feature = await loadFeature('./spot-param.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A known spot id resolves to its spot', ({ Given, When, Then }) => {
    let param: unknown;
    let route: SpotRoute | undefined;

    Given('a route param of donabate', () => {
      param = 'donabate';
    });
    When('I resolve the spot route', () => {
      route = resolveSpotRoute(param);
    });
    Then('the spot is Donabate', () => {
      expect(route?.spot?.name).toBe('Donabate');
    });
  });

  Scenario('Spot ids are matched case-insensitively', ({ Given, When, Then }) => {
    let param: unknown;
    let route: SpotRoute | undefined;

    Given('a route param of Donabate', () => {
      param = 'Donabate';
    });
    When('I resolve the spot route', () => {
      route = resolveSpotRoute(param);
    });
    Then('the spot is Donabate', () => {
      expect(route?.spot?.name).toBe('Donabate');
    });
  });

  Scenario('An unknown spot id keeps the id but finds no spot', ({ Given, When, Then, And }) => {
    let param: unknown;
    let route: SpotRoute | undefined;

    Given('a route param of lahinch', () => {
      param = 'lahinch';
    });
    When('I resolve the spot route', () => {
      route = resolveSpotRoute(param);
    });
    Then('the spot id is lahinch', () => {
      expect(route?.spotId).toBe('lahinch');
    });
    And('no spot is found', () => {
      expect(route?.spot).toBeUndefined();
    });
  });

  Scenario('A repeated param takes its first value', ({ Given, When, Then }) => {
    let param: unknown;
    let route: SpotRoute | undefined;

    Given('a repeated route param of donabate and lahinch', () => {
      param = ['donabate', 'lahinch'];
    });
    When('I resolve the spot route', () => {
      route = resolveSpotRoute(param);
    });
    Then('the spot is Donabate', () => {
      expect(route?.spot?.name).toBe('Donabate');
    });
  });

  Scenario('A missing param yields no id', ({ Given, When, Then }) => {
    let param: unknown;
    let route: SpotRoute | undefined;

    Given('no route param', () => {
      param = undefined;
    });
    When('I resolve the spot route', () => {
      route = resolveSpotRoute(param);
    });
    Then('there is no spot id', () => {
      expect(route?.spotId).toBeUndefined();
      expect(route?.spot).toBeUndefined();
    });
  });

  Scenario('A param with path characters is rejected', ({ Given, When, Then }) => {
    let param: unknown;
    let route: SpotRoute | undefined;

    Given('a route param of ../etc', () => {
      param = '../etc';
    });
    When('I resolve the spot route', () => {
      route = resolveSpotRoute(param);
    });
    Then('there is no spot id', () => {
      expect(route?.spotId).toBeUndefined();
      expect(route?.spot).toBeUndefined();
    });
  });
});
