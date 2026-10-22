import type { HourlyConditions, Spot } from '@tonnta/types';

import { isNullableNumberArray, isRecord, isStringArray } from '../guards';
import { classifyWind } from '../verdict';

/**
 * Open-Meteo — hourly wave forecast (Marine API, MFWAM ~8 km grid) merged
 * with hourly wind (forecast API, gusts included). Keyless; free tier is
 * non-commercial, so all calls route through our own cached proxy and the
 * paid Standard plan is the flip-a-switch upgrade at monetisation.
 */

const MARINE_URL = 'https://marine-api.open-meteo.com/v1/marine';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

interface HourlySeries {
  time: string[];
  series: Map<string, (number | null)[]>;
}

function parseHourly(payload: unknown, keys: string[]): HourlySeries {
  if (!isRecord(payload) || !isRecord(payload.hourly)) {
    throw new Error('Open-Meteo: unexpected response shape');
  }
  const hourly = payload.hourly;
  if (!isStringArray(hourly.time)) {
    throw new Error('Open-Meteo: missing hourly.time');
  }
  // Open-Meteo returns null for an hour it has no value for, for example sea
  // temperature at a coastal grid cell. Keep the nulls; each hour decides.
  const series = new Map<string, (number | null)[]>();
  for (const key of keys) {
    const values = hourly[key];
    if (!isNullableNumberArray(values) || values.length !== hourly.time.length) {
      throw new Error(`Open-Meteo: missing or malformed hourly.${key}`);
    }
    series.set(key, values);
  }
  return { time: hourly.time, series };
}

/** A series the verdict can do without: missing or malformed gives undefined, not an error. */
function optionalSeries(payload: unknown, key: string): (number | null)[] | undefined {
  if (!isRecord(payload) || !isRecord(payload.hourly)) return undefined;
  const values = payload.hourly[key];
  return isNullableNumberArray(values) ? values : undefined;
}

function seriesValue(data: HourlySeries, key: string, index: number): number | undefined {
  return data.series.get(key)?.[index] ?? undefined;
}

export async function fetchHourlyConditions(
  spot: Spot,
  fetchImpl: typeof fetch = fetch
): Promise<HourlyConditions[]> {
  const marineParams = new URLSearchParams({
    latitude: String(spot.latitude),
    longitude: String(spot.longitude),
    hourly: 'wave_height,wave_period,wave_direction,sea_surface_temperature',
    timezone: 'UTC',
    forecast_days: '7',
  });
  const windParams = new URLSearchParams({
    latitude: String(spot.latitude),
    longitude: String(spot.longitude),
    hourly: 'wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code',
    wind_speed_unit: 'kmh',
    timezone: 'UTC',
    forecast_days: '7',
  });

  const [marineRes, windRes] = await Promise.all([
    fetchImpl(`${MARINE_URL}?${marineParams}`),
    fetchImpl(`${FORECAST_URL}?${windParams}`),
  ]);
  if (!marineRes.ok) {
    throw new Error(`Open-Meteo marine: HTTP ${marineRes.status}`);
  }
  if (!windRes.ok) {
    throw new Error(`Open-Meteo forecast: HTTP ${windRes.status}`);
  }

  const marine = parseHourly(await marineRes.json(), [
    'wave_height',
    'wave_period',
    'wave_direction',
    'sea_surface_temperature',
  ]);
  const windPayload: unknown = await windRes.json();
  const wind = parseHourly(windPayload, ['wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m']);
  const weatherCodes = optionalSeries(windPayload, 'weather_code');

  const windIndexByTime = new Map(wind.time.map((time, index) => [time, index]));

  const hours: HourlyConditions[] = [];
  for (let i = 0; i < marine.time.length; i += 1) {
    const time = marine.time[i];
    if (time === undefined) continue;
    const windIndex = windIndexByTime.get(time);
    if (windIndex === undefined) continue;

    const waveHeightM = seriesValue(marine, 'wave_height', i);
    const wavePeriodS = seriesValue(marine, 'wave_period', i);
    const waveDirectionDeg = seriesValue(marine, 'wave_direction', i);
    const windSpeedKmh = seriesValue(wind, 'wind_speed_10m', windIndex);
    const windDirectionDeg = seriesValue(wind, 'wind_direction_10m', windIndex);
    const windGustKmh = seriesValue(wind, 'wind_gusts_10m', windIndex);
    // An hour without waves or wind cannot be judged, so it is left out
    // rather than failing the whole forecast.
    if (
      waveHeightM === undefined ||
      wavePeriodS === undefined ||
      waveDirectionDeg === undefined ||
      windSpeedKmh === undefined ||
      windDirectionDeg === undefined ||
      windGustKmh === undefined
    ) {
      continue;
    }
    const hour: HourlyConditions = {
      // Open-Meteo emits "2026-07-03T11:00" with timezone=UTC; normalise to full ISO
      time: `${time}:00Z`,
      waveHeightM,
      wavePeriodS,
      waveDirectionDeg,
      windSpeedKmh,
      windGustKmh,
      windDirectionDeg,
      windState: classifyWind(windDirectionDeg, windSpeedKmh, spot),
    };
    const seaTempC = seriesValue(marine, 'sea_surface_temperature', i);
    if (seaTempC !== undefined) hour.seaTempC = seaTempC;
    const weatherCode = weatherCodes?.[windIndex];
    if (typeof weatherCode === 'number') hour.weatherCode = weatherCode;
    hours.push(hour);
  }
  return hours;
}
