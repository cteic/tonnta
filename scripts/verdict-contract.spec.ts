import { describe, expect, it, vi } from 'vitest';

import {
  currentEntry,
  fetchVerdictTimeline,
  isVerdictTimeline,
  toAndroidSnapshot,
  toTimelineEntries,
} from '../apps/app/src/widgets/verdict-timeline';
import { buildTimeline, handleVerdict } from '../apps/worker/src/verdict';
import { getSpot } from '../packages/data/src/spots';
import type { HourlyConditions } from '../packages/types/src';

const launchSpot = getSpot('donabate');
if (launchSpot === undefined) throw new Error('Donabate missing');
const spot = launchSpot;
const HOUR = 3_600_000;
const START = Date.parse('2026-12-21T12:00:00Z');
const hours: HourlyConditions[] = Array.from({ length: 24 }, (_, i) => ({
  time: new Date(START + i * HOUR).toISOString(),
  waveHeightM: 0.6,
  wavePeriodS: 5,
  waveDirectionDeg: 90,
  windSpeedKmh: 12,
  windGustKmh: 16,
  windDirectionDeg: 250,
  windState: 'offshore',
}));

function wireAt(now: number, sourceHours = hours) {
  const wire: unknown = JSON.parse(JSON.stringify(buildTimeline(sourceHours, spot, now)));
  if (!isVerdictTimeline(wire)) throw new Error('Producer output rejected by widget decoder');
  return wire;
}

describe('Worker-to-widget wire contract', () => {
  it('round-trips the actual v2 producer output in daylight with a terminal expiry', () => {
    const wire = wireAt(START);
    expect(wire.schemaVersion).toBe(2);
    const entries = toTimelineEntries(wire, START);
    expect(currentEntry(entries, START)?.props.verdict).toBe('GO');
    expect(currentEntry(entries, START + HOUR)?.props.status).toBe('unavailable');
  });

  it('carries short-period uncertainty from the producer through widget consumers', () => {
    const wire = wireAt(
      START,
      hours.map((hour) => ({ ...hour, wavePeriodS: 3 }))
    );
    expect(wire.hours[0]?.verdict).toBe('maybe');
    expect(wire.hours[0]?.board).toBeUndefined();
    expect(currentEntry(toTimelineEntries(wire, START), START)?.props.verdict).toBe('MAYBE');
    expect(toAndroidSnapshot(wire, START).verdict).not.toBe('GO');
  });

  it('round-trips darkness without a board or a positive Android snapshot', () => {
    const now = START + 5 * HOUR;
    const wire = wireAt(now);
    expect(wire.hours[0]?.verdict).toBe('dark');
    expect(wire.hours[0]?.board).toBeUndefined();
    expect(toTimelineEntries(wire, now)[0]?.props.status).toBe('dark');
    expect(toAndroidSnapshot(wire, now).verdict).toBe('Open Tonnta');
    expect(toAndroidSnapshot(wire, now).board).toBe('');
  });

  it('does not revive an old positive wire response after its source freshness expires', () => {
    const wire = wireAt(START);
    expect(toTimelineEntries(wire, START + HOUR)[0]?.props.status).toBe('unavailable');
    expect(toAndroidSnapshot(wire, START + HOUR).status).toBe('unavailable');
  });
});

// Synthetic upstream fixtures, not retained observations or calibrated beach truth.
// Exercise the real adapter and HTTP handler rather than constructing verdicts.
function upstreamFixture(start = START) {
  const time = Array.from({ length: 3 }, (_, i) =>
    new Date(start + i * HOUR).toISOString().slice(0, 16)
  );
  const marine: Record<string, (number | null)[]> = {
    wave_height: [0.6, 0.6, 0.6],
    wave_period: [5, 5, 5],
    wave_direction: [90, 90, 90],
    sea_surface_temperature: [12, 12, 12],
  };
  const wind: Record<string, (number | null)[]> = {
    wind_speed_10m: [12, 12, 12],
    wind_direction_10m: [250, 250, 250],
    wind_gusts_10m: [16, 16, 16],
  };
  const windTime = [...time];
  const fetchImpl: typeof fetch = async (input) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    expect(url.searchParams.get('timezone')).toBe('UTC');
    const isMarine = url.hostname === 'marine-api.open-meteo.com';
    if (!isMarine) expect(url.searchParams.get('wind_speed_unit')).toBe('kmh');
    return Response.json({
      hourly: { time: isMarine ? time : windTime, ...(isMarine ? marine : wind) },
    });
  };
  const cache = { get: vi.fn(async () => null), put: vi.fn(async () => undefined) };
  const request = (now = start) =>
    handleVerdict(new URL('https://tonnta.test/verdict?spot=donabate'), cache, now, fetchImpl);
  return { marine, wind, windTime, cache, request };
}

async function decodeResponse(response: Response) {
  expect(response.status).toBe(200);
  const wire: unknown = await response.json();
  if (!isVerdictTimeline(wire)) throw new Error('HTTP response rejected by widget decoder');
  return wire;
}

describe('Upstream-to-HTTP-to-widget deterministic surf fixtures', () => {
  it.each([
    { period: 3.99, verdict: 'maybe', label: 'MAYBE', board: undefined },
    { period: 4, verdict: 'go', label: 'GO', board: 'foamie' },
    { period: 5, verdict: 'go', label: 'GO', board: 'longboard' },
  ])(
    'retains the $period-second scoring boundary through JSON',
    async ({ period, verdict, label, board }) => {
      const fixture = upstreamFixture();
      fixture.marine.wave_period = [period, 5, 5];
      const wire = await decodeResponse(await fixture.request());
      expect(wire.hours[0]).toMatchObject({ time: '2026-12-21T12:00:00Z', verdict });
      expect(wire.hours[0]?.board).toBe(board);
      const props = currentEntry(toTimelineEntries(wire, START), START)?.props;
      expect(props?.verdict).toBe(label);
      expect(props?.board).toBe(
        board === undefined ? '' : `${board === 'foamie' ? 'Foamie' : 'Longboard'} day`
      );
      expect(toAndroidSnapshot(wire, START).board).toBe('');
      expect(fixture.cache.put).toHaveBeenCalledOnce();
    }
  );

  it('produces identical scores, reasons and projections for identical inputs and clock', async () => {
    const fixture = upstreamFixture();
    fixture.marine.wave_period = [3.99, 4, 5];
    const first = await decodeResponse(await fixture.request());
    const second = await decodeResponse(await fixture.request());
    expect(second).toEqual(first);
    expect(first.hours.map(({ verdict, board, reason }) => ({ verdict, board, reason }))).toEqual([
      {
        verdict: 'maybe',
        board: undefined,
        reason: 'Short-period sea; breaking surf is unconfirmed. Check locally.',
      },
      {
        verdict: 'go',
        board: 'foamie',
        reason: '0.6m at 4s and the wind is clean — worth going down.',
      },
      {
        verdict: 'go',
        board: 'longboard',
        reason: '0.6m at 5s and the wind is clean — worth going down.',
      },
    ]);
    expect(toTimelineEntries(second, START)).toEqual(toTimelineEntries(first, START));
    expect(toAndroidSnapshot(second, START)).toEqual(toAndroidSnapshot(first, START));
    // Both requests use fresh adapter/scoring work, not a cache replay.
    expect(fixture.cache.put).toHaveBeenCalledTimes(2);
  });

  it('distinguishes a valid zero sea from missing observations', async () => {
    const fixture = upstreamFixture();
    fixture.marine.wave_height = [0, 0.6, 0.6];
    fixture.marine.wave_period = [0, 5, 5];
    const wire = await decodeResponse(await fixture.request());
    expect(wire.hours[0]).toMatchObject({ verdict: 'flat', waveHeightM: 0, wavePeriodS: 0 });
    expect(currentEntry(toTimelineEntries(wire, START), START)?.props.verdict).toBe('FLAT');
  });

  it.each([
    { label: 'missing height', field: 'wave_height', value: null },
    { label: 'negative height', field: 'wave_height', value: -1 },
    { label: 'zero period with waves', field: 'wave_period', value: 0 },
    { label: 'invalid direction', field: 'wave_direction', value: 361 },
  ])('does not substitute a future GO for $label in the current hour', async ({ field, value }) => {
    const fixture = upstreamFixture();
    fixture.marine[field] = [value, 0.6, 0.6];
    const response = await fixture.request();
    expect(response.status).toBe(502);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.clone().json()).toEqual({ error: 'forecast unavailable' });
    const endpoint: typeof fetch = async () => response;
    await expect(fetchVerdictTimeline('https://tonnta.test/verdict', endpoint)).rejects.toThrow(
      'HTTP 502'
    );
    expect(fixture.cache.put).not.toHaveBeenCalled();
  });

  it('joins wind by timestamp, not array position, and rejects unmatched current coverage', async () => {
    const fixture = upstreamFixture();
    fixture.windTime.shift();
    for (const values of Object.values(fixture.wind)) values.shift();
    expect((await fixture.request()).status).toBe(502);
    const wire = await decodeResponse(await fixture.request(START + HOUR));
    expect(wire.hours[0]?.time).toBe('2026-12-21T13:00:00Z');
    expect(wire.hours[0]?.verdict).toBe('go');
  });

  it('joins reordered wind timestamps to their own measurements, not marine positions', async () => {
    const fixture = upstreamFixture();
    fixture.windTime.reverse();
    // Wind rows now represent 14:00, 13:00, 12:00, respectively.
    fixture.wind.wind_speed_10m = [40, 28, 12];
    fixture.wind.wind_gusts_10m = [50, 32, 16];
    fixture.wind.wind_direction_10m = [90, 90, 250];
    const wire = await decodeResponse(await fixture.request());
    expect(
      wire.hours.map(({ time, windSpeedKmh, verdict, board }) => ({
        time,
        windSpeedKmh,
        verdict,
        board,
      }))
    ).toEqual([
      { time: '2026-12-21T12:00:00Z', windSpeedKmh: 12, verdict: 'go', board: 'longboard' },
      { time: '2026-12-21T13:00:00Z', windSpeedKmh: 28, verdict: 'maybe', board: 'foamie' },
      { time: '2026-12-21T14:00:00Z', windSpeedKmh: 40, verdict: 'blown', board: undefined },
    ]);
  });

  it('keeps a missing future hour unavailable rather than bridging it with GO', async () => {
    const fixture = upstreamFixture();
    fixture.marine.wave_height = [0.6, null, 0.6];
    const now = START + HOUR / 2;
    const wire = await decodeResponse(await fixture.request(now));
    expect(wire.hours.map((hour) => hour.time)).toEqual([
      '2026-12-21T12:00:00Z',
      '2026-12-21T14:00:00Z',
    ]);
    const entries = toTimelineEntries(wire, now);
    expect(currentEntry(entries, START + HOUR - 1)?.props.verdict).toBe('GO');
    expect(currentEntry(entries, START + HOUR)?.props.status).toBe('unavailable');
    expect(toAndroidSnapshot(wire, START + HOUR).status).toBe('unavailable');
  });

  it.each([
    { time: '2026-10-22T07:00:00Z', verdict: 'dark' },
    { time: '2026-10-22T08:00:00Z', verdict: 'go' },
    { time: '2026-12-21T16:00:00Z', verdict: 'dark' },
  ])('preserves full-hour daylight at $time', async ({ time, verdict }) => {
    const now = Date.parse(time);
    const wire = await decodeResponse(await upstreamFixture(now).request());
    expect(wire.hours[0]?.verdict).toBe(verdict);
    const props = currentEntry(toTimelineEntries(wire, now), now)?.props;
    expect(props?.status).toBe(verdict === 'dark' ? 'dark' : 'forecast');
    if (verdict === 'dark') {
      expect(wire.hours[0]?.board).toBeUndefined();
      expect(props?.board).toBe('');
    }
  });

  it.each([
    { date: '2026-03-28', range: '12:00–13:00' },
    { date: '2026-03-29', range: '13:00–14:00' },
    { date: '2026-10-24', range: '13:00–14:00' },
    { date: '2026-10-25', range: '12:00–13:00' },
  ])('keeps UTC validity but Dublin display across DST on $date', async ({ date, range }) => {
    const now = Date.parse(`${date}T12:00:00Z`);
    const wire = await decodeResponse(await upstreamFixture(now).request());
    expect(wire.hours[0]?.time).toBe(`${date}T12:00:00Z`);
    expect(wire.hours[0]?.validUntil).toBe(`${date}T13:00:00.000Z`);
    const entries = toTimelineEntries(wire, now);
    expect(currentEntry(entries, now)?.props.footer).toContain(range);
    expect(currentEntry(entries, now + HOUR - 1)?.props.verdict).toBe('GO');
    expect(currentEntry(entries, now + HOUR)?.props.status).toBe('unavailable');
  });
});
