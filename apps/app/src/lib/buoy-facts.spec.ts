import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { BuoyObservation } from '@tonnta/types';

import type { BuoyFacts } from './buoy-facts';
import { buoyFacts } from './buoy-facts';

const feature = await loadFeature('./buoy-facts.feature');
const NOW = Date.parse('2026-12-21T12:00:00Z');
const MINUTE = 60_000;

function observation(minutesAgo: number, readings: Partial<BuoyObservation>): BuoyObservation {
  return {
    stationId: 'M2',
    time: new Date(NOW - minutesAgo * MINUTE).toISOString(),
    source: 'marine-institute',
    ...readings,
  };
}

function values(facts: BuoyFacts): Record<string, string> {
  if (facts.status !== 'observed') throw new Error('Expected an observation');
  return Object.fromEntries(facts.facts.map((fact) => [fact.label, fact.value]));
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('A recent observation shows every reading with its age', ({ Given, Then, And }) => {
    let facts: BuoyFacts;
    Given('an M2 observation from 40 minutes ago with all readings', () => {
      facts = buoyFacts(
        observation(40, {
          waveHeightM: 1.24,
          wavePeriodS: 7.6,
          windSpeedKmh: 22.2,
          windDirectionDeg: 315,
          seaTempC: 10.04,
        }),
        NOW
      );
    });
    Then('the card lists waves, period, wind and sea temperature', () => {
      expect(values(facts)).toEqual({
        Waves: '1.2 m',
        Period: '8 s',
        Wind: '22 km/h from NW',
        Sea: '10.0 °C',
      });
    });
    And('the observation is current and 40 minutes old', () => {
      expect(facts).toMatchObject({ stale: false, age: '40 min ago' });
    });
  });

  Scenario('Readings the buoy did not report say so', ({ Given, Then }) => {
    let facts: BuoyFacts;
    Given('an M2 observation with only a wave height', () => {
      facts = buoyFacts(observation(10, { waveHeightM: 0.8 }), NOW);
    });
    Then('period, wind and sea temperature are marked not reported', () => {
      expect(values(facts)).toEqual({
        Waves: '0.8 m',
        Period: 'Not reported',
        Wind: 'Not reported',
        Sea: 'Not reported',
      });
    });
  });

  Scenario('An old observation is marked stale', ({ Given, Then }) => {
    let facts: BuoyFacts;
    Given('an M2 observation from 5 hours ago', () => {
      facts = buoyFacts(observation(300, { waveHeightM: 0.8 }), NOW);
    });
    Then('the observation is marked stale and 5 hours old', () => {
      expect(facts).toMatchObject({ status: 'observed', stale: true, age: '5 hours ago' });
    });
  });

  Scenario('No observation is reported as missing', ({ Given, Then }) => {
    let facts: BuoyFacts;
    Given('no M2 observation', () => {
      facts = buoyFacts(undefined, NOW);
    });
    Then('the buoy facts are missing', () => {
      expect(facts).toEqual({ status: 'missing' });
    });
  });
});
