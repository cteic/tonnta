import { describe, expect, it } from 'vitest';

import {
  currentEntry,
  isVerdictTimeline,
  toAndroidSnapshot,
  toTimelineEntries,
} from '../apps/app/src/widgets/verdict-timeline';
import { buildTimeline } from '../apps/worker/src/verdict';
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
