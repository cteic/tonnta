import { describe, expect, it } from 'vitest';

import type { Spot } from '@tonnta/types';

import { getSpot } from '../spots';
import { fetchHourlyConditions } from './open-meteo';

function launchSpot(): Spot {
  const spot = getSpot('donabate');
  if (spot === undefined) throw new Error('Missing Donabate');
  return spot;
}

function fixtures() {
  const time = ['2026-11-09T12:00', '2026-11-09T13:00'];
  const marine: Record<string, (number | null)[]> = {
    wave_height: [0.5, 0.6],
    wave_period: [5, 5],
    wave_direction: [90, 90],
    sea_surface_temperature: [12, 12],
  };
  const wind: Record<string, (number | null)[]> = {
    wind_speed_10m: [12, 12],
    wind_direction_10m: [250, 250],
    wind_gusts_10m: [16, 16],
    weather_code: [0, 0],
  };
  const fetchImpl: typeof fetch = async (input) => {
    let url: string;
    if (typeof input === 'string') url = input;
    else url = input instanceof URL ? input.href : input.url;
    const response = new Response('{}', { status: 200 });
    // Keep non-finite numbers intact to exercise the decoder, not JSON.stringify's
    // conversion of them to null. Actual JSON can also overflow with e.g. 1e400.
    Object.defineProperty(response, 'json', {
      value: async () => ({
        hourly: { time, ...(url.includes('marine-api') ? marine : wind) },
      }),
    });
    return response;
  };
  return { time, marine, wind, fetchImpl };
}

const MARINE_INPUTS = ['wave_height', 'wave_period', 'wave_direction'];
const WIND_INPUTS = ['wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m'];

describe('Open-Meteo physical input validation', () => {
  for (const field of [...MARINE_INPUTS, ...WIND_INPUTS]) {
    it.each([null, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1])(
      `drops only the affected hour when ${field} is %s`,
      async (invalid) => {
        const { marine, wind, fetchImpl } = fixtures();
        const series = MARINE_INPUTS.includes(field) ? marine : wind;
        series[field] = [invalid, 5];
        const hours = await fetchHourlyConditions(launchSpot(), fetchImpl);
        expect(hours.map((hour) => hour.time)).toEqual(['2026-11-09T13:00:00Z']);
      }
    );
  }

  it('drops a positive wave height with a nonpositive period, not all forecast hours', async () => {
    const { marine, fetchImpl } = fixtures();
    marine.wave_period = [0, 5];
    const hours = await fetchHourlyConditions(launchSpot(), fetchImpl);
    expect(hours.map((hour) => hour.time)).toEqual(['2026-11-09T13:00:00Z']);
  });

  it('allows zero height and period without inventing waves', async () => {
    const { marine, fetchImpl } = fixtures();
    marine.wave_height = [0, 0.6];
    marine.wave_period = [0, 5];
    const hours = await fetchHourlyConditions(launchSpot(), fetchImpl);
    expect(hours).toHaveLength(2);
    expect(hours[0]?.waveHeightM).toBe(0);
    expect(hours[0]?.wavePeriodS).toBe(0);
  });

  it.each(['wave_direction', 'wind_direction_10m'])('rejects out-of-range %s', async (field) => {
    const { marine, wind, fetchImpl } = fixtures();
    const series = field === 'wave_direction' ? marine : wind;
    series[field] = [361, 360];
    const hours = await fetchHourlyConditions(launchSpot(), fetchImpl);
    expect(hours.map((hour) => hour.time)).toEqual(['2026-11-09T13:00:00Z']);
  });

  it('keeps valid hours when optional readings are null or non-finite', async () => {
    const { marine, wind, fetchImpl } = fixtures();
    marine.sea_surface_temperature = [null, Number.POSITIVE_INFINITY];
    wind.weather_code = [null, Number.NaN];
    const hours = await fetchHourlyConditions(launchSpot(), fetchImpl);
    expect(hours).toHaveLength(2);
    expect(
      hours.every((hour) => hour.seaTempC === undefined && hour.weatherCode === undefined)
    ).toBe(true);
  });

  it('retains signed sea temperature and valid weather codes', async () => {
    const { marine, wind, fetchImpl } = fixtures();
    marine.sea_surface_temperature = [-1, 12];
    wind.weather_code = [95, 0];
    const hours = await fetchHourlyConditions(launchSpot(), fetchImpl);
    expect(hours[0]?.seaTempC).toBe(-1);
    expect(hours[0]?.weatherCode).toBe(95);
  });

  it.each(['not-a-date', '2026-11-31T12:00', '2026-11-09T24:00'])(
    'does not preserve malformed forecast time %s as current data',
    async (invalid) => {
      const { time, fetchImpl } = fixtures();
      time[0] = invalid;
      const hours = await fetchHourlyConditions(launchSpot(), fetchImpl);
      expect(hours.map((hour) => hour.time)).toEqual(['2026-11-09T13:00:00Z']);
    }
  );

  it('returns no forecast hours when required observations are all missing', async () => {
    const { marine, fetchImpl } = fixtures();
    marine.wave_height = [null, null];
    expect(await fetchHourlyConditions(launchSpot(), fetchImpl)).toEqual([]);
  });
});
