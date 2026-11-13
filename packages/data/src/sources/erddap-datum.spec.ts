import { describe, expect, it, vi } from 'vitest';

import { fetchTideEvents, fetchTideGaugeReadings } from './erddap';

function response(columnNames: string[], rows: unknown[][]) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify({ table: { columnNames, rows } })));
}

const time = '2026-11-13T12:00:00Z';

describe('Marine Institute tide datum contract', () => {
  it('selects prediction OD Malin rather than LAT and preserves signed metres', async () => {
    const fetcher = response(
      ['Water_Level_LAT', 'time', 'Water_Level_ODMalin', 'tide_time_category'],
      [[1.5, time, -1.234, 'LOW']]
    );
    expect(await fetchTideEvents('Skerries', 3, fetcher)).toEqual([
      { time, kind: 'low', heightM: -1.234 },
    ]);
    const url = String(fetcher.mock.calls[0]?.[0]);
    expect(url).toContain('time,stationID,tide_time_category,Water_Level_ODMalin&');
    expect(url).toContain('stationID=%22Skerries%22');
    expect(url).not.toContain('Water_Level_LAT');
  });

  it('selects observed OD Malin rather than LAT and preserves signed metres', async () => {
    const fetcher = response(
      ['Water_Level_LAT', 'Water_Level_OD_Malin', 'time'],
      [[1.5, -1.234, time]]
    );
    expect(await fetchTideGaugeReadings('Skerries Harbour', 60, fetcher)).toEqual([
      { time, levelM: -1.234 },
    ]);
    const url = String(fetcher.mock.calls[0]?.[0]);
    expect(url).toContain('time,station_id,Water_Level_OD_Malin&');
    expect(url).toContain('station_id=%22Skerries%20Harbour%22');
    expect(url).not.toContain('Water_Level_LAT');
  });

  it('does not silently use LAT if the requested prediction datum is missing', async () => {
    const fetcher = response(
      ['time', 'Water_Level_LAT', 'tide_time_category'],
      [[time, 1.5, 'LOW']]
    );
    await expect(fetchTideEvents('Skerries', 3, fetcher)).rejects.toThrow(
      'missing column Water_Level_ODMalin'
    );
  });

  it('does not silently use LAT if the requested observed datum is missing', async () => {
    const fetcher = response(['time', 'Water_Level_LAT'], [[time, 1.5]]);
    await expect(fetchTideGaugeReadings('Skerries Harbour', 60, fetcher)).rejects.toThrow(
      'missing column Water_Level_OD_Malin'
    );
  });
});
