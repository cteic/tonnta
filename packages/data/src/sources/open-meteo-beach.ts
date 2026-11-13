import type { BathingWater, BathingWaterSea, BathingWaterWeather } from '@tonnta/types';

import { asFiniteNumber, isNullableNumberArray, isRecord, isStringArray } from '../guards';

/**
 * Current Open-Meteo model values at a bathing water. These are model
 * estimates for a grid cell, not measurements at the beach. Inland waters
 * get no marine values: the marine model returns null away from the sea.
 */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';

const HOUR_MS = 3_600_000;

/** Open-Meteo times are UTC without a zone when `timezone=UTC`. */
function utcMs(time: string): number {
  return Date.parse(time.endsWith('Z') ? time : `${time}Z`);
}

function currentTime(current: Record<string, unknown>): string {
  if (typeof current.time !== 'string' || Number.isNaN(utcMs(current.time))) {
    throw new Error('Open-Meteo: missing current.time');
  }
  return new Date(utcMs(current.time)).toISOString();
}

/**
 * Rain over the 48 hours up to `nowMs`. Each hourly value is the total for
 * the hour before its timestamp. Any missing hour makes the total unknown.
 */
export function rainLast48h(
  times: string[],
  values: (number | null)[],
  nowMs: number
): number | undefined {
  let total = 0;
  let hours = 0;
  for (let index = 0; index < times.length; index += 1) {
    const at = utcMs(times[index] ?? '');
    if (!(at > nowMs - 48 * HOUR_MS && at <= nowMs)) continue;
    const value = asFiniteNumber(values[index]);
    if (value === undefined || value < 0) return undefined;
    total += value;
    hours += 1;
  }
  if (hours < 48) return undefined;
  return Math.round(total * 10) / 10;
}

export function parseBeachWeather(payload: unknown): BathingWaterWeather {
  if (!isRecord(payload) || !isRecord(payload.current)) {
    throw new Error('Open-Meteo: unexpected response shape');
  }
  const { current } = payload;
  const weather: BathingWaterWeather = { time: currentTime(current) };
  const air = asFiniteNumber(current.temperature_2m);
  if (air !== undefined) weather.airTemperatureC = air;
  const wind = asFiniteNumber(current.wind_speed_10m);
  if (wind !== undefined && wind >= 0) weather.windSpeedKmh = wind;
  const gust = asFiniteNumber(current.wind_gusts_10m);
  if (gust !== undefined && gust >= 0) weather.windGustKmh = gust;
  const direction = asFiniteNumber(current.wind_direction_10m);
  if (direction !== undefined && direction >= 0 && direction <= 360) {
    weather.windDirectionDeg = direction;
  }
  if (
    isRecord(payload.hourly) &&
    isStringArray(payload.hourly.time) &&
    isNullableNumberArray(payload.hourly.precipitation) &&
    payload.hourly.precipitation.length === payload.hourly.time.length
  ) {
    const rain = rainLast48h(
      payload.hourly.time,
      payload.hourly.precipitation,
      utcMs(weather.time)
    );
    if (rain !== undefined) weather.rainLast48hMm = rain;
  }
  return weather;
}

export function parseBeachSea(payload: unknown): BathingWaterSea {
  if (!isRecord(payload) || !isRecord(payload.current)) {
    throw new Error('Open-Meteo marine: unexpected response shape');
  }
  const { current } = payload;
  const sea: BathingWaterSea = { time: currentTime(current) };
  const water = asFiniteNumber(current.sea_surface_temperature);
  if (water !== undefined) sea.waterTemperatureC = water;
  const waves = asFiniteNumber(current.wave_height);
  if (waves !== undefined && waves >= 0) sea.waveHeightM = waves;
  return sea;
}

function position(water: BathingWater): Record<string, string> {
  return { latitude: String(water.latitude), longitude: String(water.longitude), timezone: 'UTC' };
}

export async function fetchBeachWeather(
  water: BathingWater,
  fetchImpl: typeof fetch = fetch
): Promise<BathingWaterWeather> {
  const params = new URLSearchParams({
    ...position(water),
    current: 'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
    hourly: 'precipitation',
    wind_speed_unit: 'kmh',
    past_days: '2',
    forecast_days: '1',
  });
  const response = await fetchImpl(`${FORECAST_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Open-Meteo: HTTP ${response.status}`);
  return parseBeachWeather(await response.json());
}

export async function fetchBeachSea(
  water: BathingWater,
  fetchImpl: typeof fetch = fetch
): Promise<BathingWaterSea> {
  const params = new URLSearchParams({
    ...position(water),
    current: 'wave_height,sea_surface_temperature',
  });
  const response = await fetchImpl(`${MARINE_URL}?${params.toString()}`);
  if (!response.ok) throw new Error(`Open-Meteo marine: HTTP ${response.status}`);
  return parseBeachSea(await response.json());
}
