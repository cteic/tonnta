import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import {
  MAX_FORECAST_AGE_MS,
  firstLightLabel,
  getSpot,
  isDaylightHour,
  sunTimes,
} from '@tonnta/data';
import type { HourlyConditions } from '@tonnta/types';

import { buildChartGeometry } from '../chart/chart-geometry';
import { formatHour } from './format';
import {
  surfChartHourLabel,
  surfConditionsLine,
  surfDayDetail,
  surfForecastAt,
  surfHeadlineFacts,
  surfRating,
} from './surf-forecast';

const feature = await loadFeature('./surf-forecast.feature');
const DAYLIGHT = Date.parse('2026-12-21T12:30:00Z');
const DARK = Date.parse('2026-12-21T20:30:00Z');
const FIRST_LIGHT = '2026-12-22T08:00:00.000Z';

function forecastHour(time: string): HourlyConditions {
  return {
    time,
    waveHeightM: 0.6,
    wavePeriodS: 5,
    waveDirectionDeg: 90,
    windSpeedKmh: 12,
    windDirectionDeg: 270,
    windGustKmh: 20,
    windState: 'offshore',
  };
}

/** Every hour of a UTC day; Donabate is on UTC in December. */
function dayOfHours(date: string): HourlyConditions[] {
  return Array.from({ length: 24 }, (_, hour) =>
    forecastHour(new Date(Date.parse(`${date}T00:00:00Z`) + hour * 3_600_000).toISOString())
  );
}

function donabate() {
  const spot = getSpot('donabate');
  if (spot === undefined) throw new Error('Missing Donabate fixture');
  return spot;
}

function forecastAt(hours: HourlyConditions[], now: number, loadedAt = now) {
  const spot = getSpot('donabate');
  if (spot === undefined) throw new Error('Missing Donabate fixture');
  return surfForecastAt(hours, spot, loadedAt, now);
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('Missing hours stay missing in the forecast and chart', ({ Given, Then, And }) => {
    let forecast: ReturnType<typeof forecastAt>;
    Given('a fresh forecast with no current hour and a gap between later hours', () => {
      forecast = forecastAt(
        ['13:00', '15:00'].map((time) => forecastHour(`2026-12-21T${time}:00Z`)),
        DAYLIGHT
      );
    });
    Then('no later hour is presented as current', () => {
      expect(forecast).toMatchObject({ status: 'fresh', dark: false, current: undefined });
    });
    And('the chart shows the missed hour and breaks the plotted lines', () => {
      if (forecast.status !== 'fresh') throw new Error('Expected a fresh forecast');
      expect(forecast.hours).toHaveLength(24);
      expect(forecast.days[1]).toEqual({ date: '2026-12-22' });
      const gap = forecast.hours[2];
      if (gap === undefined) throw new Error('Expected a chart slot for the gap');
      expect(surfChartHourLabel(gap, 'Europe/Dublin')).toBe(
        '14:00. Forecast unavailable. Daylight.'
      );
      const chart = buildChartGeometry(forecast.hours, {
        width: 248,
        height: 168,
        top: 4,
        right: 4,
        bottom: 4,
        left: 4,
      });
      expect(chart.waveLine.match(/M/g)).toHaveLength(2);
      expect(chart.windLine.match(/M/g)).toHaveLength(2);
      expect(chart.waveArea).toBe('');
    });
  });

  Scenario('An old forecast expires while the app is open', ({ Given, Then }) => {
    let forecast: ReturnType<typeof forecastAt>;
    Given('forecast data checked an hour ago', () => {
      const hours = [forecastHour('2026-12-21T12:00:00Z')];
      const loadedAt = DAYLIGHT - MAX_FORECAST_AGE_MS;
      expect(forecastAt(hours, DAYLIGHT - 1, loadedAt).status).toBe('fresh');
      forecast = forecastAt(hours, DAYLIGHT, loadedAt);
    });
    Then('the forecast is marked stale instead of showing the old values', () => {
      expect(forecast).toEqual({ status: 'stale' });
    });
  });

  Scenario(
    'After dark the first-light preview reports forecast conditions',
    ({ Given, Then, And }) => {
      let forecast: ReturnType<typeof forecastAt>;
      Given('an after-dark forecast with data for the hour the sun rises in', () => {
        forecast = forecastAt(
          [forecastHour('2026-12-21T20:00:00Z'), forecastHour(FIRST_LIGHT)],
          DARK
        );
      });
      Then('sunrise and first-light wave and wind conditions are available', () => {
        if (forecast.status !== 'fresh' || forecast.firstLight === undefined)
          throw new Error('Expected a first-light forecast');
        expect(forecast.dark).toBe(true);
        expect(Date.parse(forecast.sunrise ?? '')).toBeGreaterThan(DARK);
        expect(forecast.firstLight.time).toBe(FIRST_LIGHT);
        expect(surfConditionsLine(forecast.firstLight)).toBe(
          'Waves 0.6 m · Period 5 s · Wind 12 km/h offshore'
        );
      });
      And('the chart announces the darkness and forecast values', () => {
        if (forecast.status !== 'fresh' || forecast.hours[0] === undefined)
          throw new Error('Expected a chart slot for the current hour');
        expect(surfChartHourLabel(forecast.hours[0], 'Europe/Dublin')).toBe(
          '20:00. Waves 0.6 metres, wind 12 kilometres per hour. Outside full daylight hours.'
        );
      });
    }
  );

  Scenario('The first-light label gives sunrise, not the start of the hour', ({ Given, Then }) => {
    let forecast: ReturnType<typeof forecastAt>;
    Given('an after-dark forecast with data for the hour the sun rises in', () => {
      forecast = forecastAt(
        [forecastHour('2026-12-21T20:00:00Z'), forecastHour(FIRST_LIGHT)],
        DARK
      );
    });
    Then('the first-light label says the preview holds from sunrise', () => {
      if (forecast.status !== 'fresh' || forecast.firstLight === undefined)
        throw new Error('Expected a first-light forecast');
      expect(firstLightLabel(forecast.firstLight.time, forecast.sunrise, 'Europe/Dublin')).toBe(
        `from ${formatHour(forecast.sunrise ?? '', 'Europe/Dublin')}`
      );
    });
  });

  Scenario('A missing first-light hour stays unavailable', ({ Given, Then }) => {
    let forecast: ReturnType<typeof forecastAt>;
    Given('an after-dark forecast with a later hour but no first-light hour', () => {
      forecast = forecastAt([forecastHour('2026-12-22T10:00:00Z')], DARK);
    });
    Then('sunrise is available and the first-light forecast is missing', () => {
      expect(forecast).toMatchObject({
        status: 'fresh',
        dark: true,
        sunrise: expect.any(String),
        firstLight: undefined,
      });
    });
  });
  Scenario("The headline lists the current hour's facts separately", ({ Given, Then }) => {
    let facts: ReturnType<typeof surfHeadlineFacts>;
    Given('a current hour of 0.6 m at 5 s with 12 km/h offshore wind', () => {
      facts = surfHeadlineFacts(forecastHour('2026-12-21T12:00:00Z'));
    });
    Then('the headline facts are waves, period and wind against the beach', () => {
      expect(facts).toEqual([
        { label: 'Waves', value: '0.6 m' },
        { label: 'Period', value: '5 s' },
        { label: 'Wind', value: '12 km/h', detail: 'offshore' },
      ]);
    });
  });
  Scenario('The surf rating gives its reason', ({ Given, Then }) => {
    let rating: ReturnType<typeof surfRating>;
    Given('a current hour of 0.6 m at 5 s with 12 km/h offshore wind', () => {
      rating = surfRating(forecastHour('2026-12-21T12:00:00Z'), donabate());
    });
    Then('the surf is rated good with its facts and no advice to go', () => {
      expect(rating).toEqual({
        verdict: 'go',
        quality: 'Good surf',
        headline: 'Good surf: 0.6 m at 5 s, 12 km/h offshore',
        reason: 'Rideable height, and the wind is clean.',
      });
    });
  });

  Scenario('A short-period sea is not rated good', ({ Given, Then }) => {
    let rating: ReturnType<typeof surfRating>;
    Given('a current hour of 0.6 m at 3 s with 12 km/h offshore wind', () => {
      rating = surfRating({ ...forecastHour('2026-12-21T12:00:00Z'), wavePeriodS: 3 }, donabate());
    });
    Then('the surf is rated marginal because breaking surf is unconfirmed', () => {
      expect(rating.headline).toBe('Marginal surf: 0.6 m at 3 s, 12 km/h offshore');
      expect(rating.reason).toContain('breaking surf is unconfirmed');
    });
  });

  Scenario('A strong onshore wind is rated blown out', ({ Given, Then }) => {
    let rating: ReturnType<typeof surfRating>;
    Given('a current hour of 0.8 m at 6 s with 40 km/h onshore wind', () => {
      const spot = donabate();
      rating = surfRating(
        {
          ...forecastHour('2026-12-21T12:00:00Z'),
          waveHeightM: 0.8,
          wavePeriodS: 6,
          windSpeedKmh: 40,
          windDirectionDeg: spot.facing,
          windState: 'onshore',
        },
        spot
      );
    });
    Then('the surf is rated blown out without advice', () => {
      expect(rating).toEqual({
        verdict: 'blown',
        quality: 'Blown out',
        headline: 'Blown out: 0.8 m at 6 s, 40 km/h onshore',
        reason: 'Onshore 40km/h has it blown out.',
      });
    });
  });
  Scenario(
    "A day's detail lists its daylight hours with sunrise and sunset",
    ({ Given, Then, And }) => {
      let detail: ReturnType<typeof surfDayDetail>;
      Given('a forecast for every hour of tomorrow', () => {
        detail = surfDayDetail(dayOfHours('2026-12-22'), donabate(), '2026-12-22', DAYLIGHT);
      });
      Then('the day detail gives sunrise and sunset for tomorrow', () => {
        const spot = donabate();
        const sun = sunTimes(Date.parse('2026-12-22T12:00:00Z'), spot.latitude, spot.longitude);
        expect(detail.sunrise).toBe(new Date(sun.sunrise ?? Number.NaN).toISOString());
        expect(detail.sunset).toBe(new Date(sun.sunset ?? Number.NaN).toISOString());
      });
      And('it lists only full daylight hours, in order, with their facts', () => {
        const spot = donabate();
        const expected = dayOfHours('2026-12-22')
          .map((hour) => hour.time)
          .filter((time) => isDaylightHour(time, spot));
        expect(expected.length).toBeGreaterThan(4);
        expect(detail.hours.map((hour) => hour.time)).toEqual(expected);
        expect(detail.hours[0]).toEqual({
          time: expected[0],
          facts: '0.6 m · 5 s · wind 12 km/h offshore · gusts 20 km/h',
          seaState: 'Clean',
        });
      });
    }
  );

  Scenario("A day's detail starts from the current hour", ({ Given, Then }) => {
    let detail: ReturnType<typeof surfDayDetail>;
    Given('a forecast for every hour of today, viewed at midday', () => {
      detail = surfDayDetail(dayOfHours('2026-12-21'), donabate(), '2026-12-21', DAYLIGHT);
    });
    Then('the day detail lists no hour before the current one', () => {
      expect(detail.hours[0]?.time).toBe('2026-12-21T12:00:00.000Z');
    });
  });

  Scenario("Missing hours stay out of a day's detail", ({ Given, Then }) => {
    let detail: ReturnType<typeof surfDayDetail>;
    Given('a forecast for tomorrow with no data at 12:00', () => {
      const hours = dayOfHours('2026-12-22').filter(
        (hour) => hour.time !== '2026-12-22T12:00:00.000Z'
      );
      detail = surfDayDetail(hours, donabate(), '2026-12-22', DAYLIGHT);
    });
    Then('the day detail has no 12:00 row and does not fill the gap', () => {
      const times = detail.hours.map((hour) => hour.time);
      expect(times).not.toContain('2026-12-22T12:00:00.000Z');
      expect(times).toContain('2026-12-22T11:00:00.000Z');
      expect(times).toContain('2026-12-22T13:00:00.000Z');
    });
  });
});
