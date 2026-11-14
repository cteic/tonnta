import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { HourlyConditions, Spot } from '@tonnta/types';

import { getSpot } from '../spots';
import { fetchHourlyConditions } from './open-meteo';

const feature = await loadFeature('./open-meteo.feature');

const donabate = getSpot('donabate');
if (donabate === undefined) {
  throw new Error('Donabate spot missing from registry');
}
const spot: Spot = donabate;

const TIMES = ['2026-07-04T10:00', '2026-07-04T11:00', '2026-07-04T12:00'];

const MARINE = {
  hourly: {
    time: TIMES,
    wave_height: [0.6, null, 0.5],
    wave_period: [5, 5, 5],
    wave_direction: [90, 90, 90],
    sea_surface_temperature: [15.2, 15.3, null],
  },
};

const WIND = {
  hourly: {
    time: TIMES,
    wind_speed_10m: [12, 12, 12],
    wind_direction_10m: [250, 250, 250],
    wind_gusts_10m: [16, 16, 16],
  },
};

function urlOf(input: Parameters<typeof fetch>[0]): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

const fakeFetch: typeof fetch = async (input) => {
  const body = urlOf(input).includes('marine') ? MARINE : WIND;
  return new Response(JSON.stringify(body), { status: 200 });
};

describeFeature(feature, ({ Scenario }) => {
  Scenario('Missing values drop only the hours they affect', ({ Given, When, Then, And }) => {
    let hours: HourlyConditions[] = [];

    Given(
      'a forecast of three hours where the second has no wave height and the third has no sea temperature',
      () => {
        // The payloads above
      }
    );
    When('the forecast is fetched for Donabate', async () => {
      hours = await fetchHourlyConditions(spot, fakeFetch);
    });
    Then('it returns the first and third hours', () => {
      expect(hours.map((hour) => hour.time)).toEqual([
        '2026-07-04T10:00:00Z',
        '2026-07-04T12:00:00Z',
      ]);
    });
    And('only the first hour has a sea temperature', () => {
      expect(hours.map((hour) => hour.seaTempC)).toEqual([15.2, undefined]);
    });
  });
});
