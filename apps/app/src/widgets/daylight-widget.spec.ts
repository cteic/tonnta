import { describe, expect, it } from 'vitest';

import type { VerdictTimeline } from './verdict-timeline';
import { toTimelineEntries } from './verdict-timeline';

// The server claims daylight here; the widget must still check the hour itself.
const timeline = (time: string, spotId = 'donabate'): VerdictTimeline => ({
  schemaVersion: 2,
  spot: { id: spotId, name: 'Donabate' },
  generatedAt: time,
  hours: [
    {
      time,
      verdict: 'go',
      daylight: true,
      validUntil: new Date(Date.parse(time) + 3_600_000).toISOString(),
      board: 'foamie',
      reason: 'Worth going down',
      waveHeightM: 0.6,
      wavePeriodS: 5,
      windSpeedKmh: 12,
    },
  ],
});

describe('Daylight in home-screen widgets', () => {
  it.each(['2026-10-22T07:00:00Z', '2026-12-21T17:00:00Z', '2026-06-21T20:00:00Z'])(
    'does not show GO for a wholly or partially dark hour: %s',
    (time) => {
      const props = toTimelineEntries(timeline(time))[0]?.props;
      expect(props?.verdict).toBe('Out of the water');
      expect(props?.board).toBe('');
    }
  );

  it('preserves a GO verdict during a complete daylight hour', () => {
    expect(toTimelineEntries(timeline('2026-12-21T12:00:00Z'))[0]?.props.verdict).toBe('GO');
  });

  it('does not make a recommendation when spot coordinates are unknown', () => {
    expect(toTimelineEntries(timeline('2026-12-21T12:00:00Z', 'unknown'))[0]?.props.verdict).toBe(
      'Update needed'
    );
  });
});
