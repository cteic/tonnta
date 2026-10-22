import type { BuoyObservation, TideEvent, TideGaugeReading } from '@tonnta/types';

import { asFiniteNumber, isRecord } from '../guards';

/**
 * Marine Institute ERDDAP (erddap.marine.ie) — CC BY 4.0, keyless, and the
 * institutional backbone of Tonnta's live data:
 *  - IWBNetwork: hourly weather-buoy observations (M2 sits in the Irish Sea)
 *  - IMI_TidePrediction_HighLow: high/low predictions through Jan 2029
 *  - IrishNationalTideGaugeNetwork: observed water level every 5 minutes
 * Attribution: "Data: Marine Institute" in the app's about/credits.
 */

const ERDDAP_BASE = 'https://erddap.marine.ie/erddap/tabledap';

const KNOTS_TO_KMH = 1.852;

interface ErddapTable {
  columnNames: string[];
  rows: unknown[][];
}

function parseErddapTable(payload: unknown): ErddapTable {
  if (!isRecord(payload) || !isRecord(payload.table)) {
    throw new Error('ERDDAP: unexpected response shape');
  }
  const { columnNames, rows } = payload.table;
  if (!Array.isArray(columnNames) || !Array.isArray(rows)) {
    throw new Error('ERDDAP: missing table columns or rows');
  }
  return {
    columnNames: columnNames.filter((name): name is string => typeof name === 'string'),
    rows: rows.filter((row): row is unknown[] => Array.isArray(row)),
  };
}

function columnIndex(table: ErddapTable, name: string): number {
  const index = table.columnNames.indexOf(name);
  if (index === -1) {
    throw new Error(`ERDDAP: missing column ${name}`);
  }
  return index;
}

/** Latest observation from a weather buoy (e.g. M2 for Donabate). */
export async function fetchBuoyObservation(
  stationId: string,
  fetchImpl: typeof fetch = fetch
): Promise<BuoyObservation | undefined> {
  const query =
    'time,station_id,WaveHeight,WavePeriod,WindSpeed,WindDirection,SeaTemperature' +
    `&station_id=%22${encodeURIComponent(stationId)}%22&time%3E=now-2days`;
  const response = await fetchImpl(`${ERDDAP_BASE}/IWBNetwork.json?${query}`);
  if (!response.ok) {
    throw new Error(`ERDDAP IWBNetwork: HTTP ${response.status}`);
  }
  const table = parseErddapTable(await response.json());
  const timeCol = columnIndex(table, 'time');
  const lastRow = table.rows
    .filter((row) => typeof row[timeCol] === 'string')
    .sort((a, b) => String(a[timeCol]).localeCompare(String(b[timeCol])))
    .at(-1);
  if (lastRow === undefined) {
    return undefined;
  }

  const time = lastRow[timeCol];
  if (typeof time !== 'string') {
    return undefined;
  }
  const windSpeedKnots = asFiniteNumber(lastRow[columnIndex(table, 'WindSpeed')]);
  const observation: BuoyObservation = {
    stationId,
    time,
    source: 'marine-institute',
  };
  const waveHeightM = asFiniteNumber(lastRow[columnIndex(table, 'WaveHeight')]);
  const wavePeriodS = asFiniteNumber(lastRow[columnIndex(table, 'WavePeriod')]);
  const windDirectionDeg = asFiniteNumber(lastRow[columnIndex(table, 'WindDirection')]);
  const seaTempC = asFiniteNumber(lastRow[columnIndex(table, 'SeaTemperature')]);
  if (waveHeightM !== undefined) observation.waveHeightM = waveHeightM;
  if (wavePeriodS !== undefined) observation.wavePeriodS = wavePeriodS;
  if (windSpeedKnots !== undefined) observation.windSpeedKmh = windSpeedKnots * KNOTS_TO_KMH;
  if (windDirectionDeg !== undefined) observation.windDirectionDeg = windDirectionDeg;
  if (seaTempC !== undefined) observation.seaTempC = seaTempC;
  return observation;
}

/**
 * Observed water levels from a tide gauge over the last `minutes`, oldest
 * first. The network reports every 5 minutes, about 10 minutes behind.
 */
export async function fetchTideGaugeReadings(
  stationId: string,
  minutes: number = 60,
  fetchImpl: typeof fetch = fetch
): Promise<TideGaugeReading[]> {
  const query =
    'time,station_id,Water_Level_OD_Malin' +
    `&station_id=%22${encodeURIComponent(stationId)}%22&time%3E=now-${minutes}minutes`;
  const response = await fetchImpl(`${ERDDAP_BASE}/IrishNationalTideGaugeNetwork.json?${query}`);
  // ERDDAP answers an empty window with 404 rather than an empty table.
  if (response.status === 404) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`ERDDAP tide gauge: HTTP ${response.status}`);
  }
  const table = parseErddapTable(await response.json());
  const timeCol = columnIndex(table, 'time');
  const levelCol = columnIndex(table, 'Water_Level_OD_Malin');
  const readings: TideGaugeReading[] = [];
  for (const row of table.rows) {
    const time = row[timeCol];
    const levelM = asFiniteNumber(row[levelCol]);
    if (typeof time !== 'string' || levelM === undefined) continue;
    readings.push({ time, levelM });
  }
  return readings.sort((a, b) => a.time.localeCompare(b.time));
}

/** Upcoming high/low tides for a prediction station (e.g. Skerries). */
export async function fetchTideEvents(
  stationId: string,
  days = 3,
  fetchImpl: typeof fetch = fetch
): Promise<TideEvent[]> {
  const query =
    'time,stationID,tide_time_category,Water_Level_ODMalin' +
    `&stationID=%22${encodeURIComponent(stationId)}%22&time%3E=now&time%3C=now%2B${days}days`;
  const response = await fetchImpl(`${ERDDAP_BASE}/IMI_TidePrediction_HighLow.json?${query}`);
  if (!response.ok) {
    throw new Error(`ERDDAP tides: HTTP ${response.status}`);
  }
  const table = parseErddapTable(await response.json());
  const timeCol = columnIndex(table, 'time');
  const kindCol = columnIndex(table, 'tide_time_category');
  const levelCol = columnIndex(table, 'Water_Level_ODMalin');

  const events: TideEvent[] = [];
  for (const row of table.rows) {
    const time = row[timeCol];
    const kindRaw = row[kindCol];
    const heightM = asFiniteNumber(row[levelCol]);
    if (typeof time !== 'string' || typeof kindRaw !== 'string' || heightM === undefined) {
      continue;
    }
    const kind = kindRaw.toUpperCase() === 'HIGH' ? 'high' : 'low';
    events.push({ time, kind, heightM });
  }
  return events.sort((a, b) => a.time.localeCompare(b.time));
}
