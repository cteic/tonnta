import { describe, expect, it, vi } from 'vitest';

import type { HourVerdict, VerdictTimeline } from './verdict-timeline';
import {
  currentEntry,
  fetchVerdictTimeline,
  isVerdictTimeline,
  toAndroidSnapshot,
  toTimelineEntries,
} from './verdict-timeline';
import type { WidgetSink } from './widget-refresh';
import { refreshWidgetContent } from './widget-refresh';

const START = Date.parse('2026-12-21T14:00:00Z');
const HOUR = 3_600_000;
const hour = (time = new Date(START).toISOString()): HourVerdict => ({
  time,
  verdict: 'go',
  daylight: true,
  validUntil: new Date(Date.parse(time) + HOUR).toISOString(),
  board: 'foamie',
  reason: 'Worth going down',
  waveHeightM: 0.6,
  wavePeriodS: 5,
  windSpeedKmh: 12,
});
const timeline = (hours: HourVerdict[] = [hour()]): VerdictTimeline => ({
  schemaVersion: 2,
  spot: { id: 'donabate', name: 'Donabate' },
  generatedAt: new Date(START).toISOString(),
  hours,
});
const sink = (): WidgetSink => ({
  updateTimeline: vi.fn<WidgetSink['updateTimeline']>(),
  updateSnapshot: vi.fn<WidgetSink['updateSnapshot']>(),
});
const fetchSource =
  (source: VerdictTimeline): typeof fetch =>
  async () =>
    Response.json(source);

describe('Widget source expiry and compatibility', () => {
  it('schedules an unavailable entry after the last daylight forecast, without a network callback', () => {
    const entries = toTimelineEntries(timeline(), START);
    expect(currentEntry(entries, START + HOUR - 1)?.props.verdict).toBe('GO');
    expect(currentEntry(entries, START + HOUR)?.props.status).toBe('unavailable');
    expect(currentEntry(entries, START + 24 * HOUR)?.props.board).toBe('');
  });

  it('expires the source after an hour, not at the end of a seven-day forecast', () => {
    const entries = toTimelineEntries(
      timeline([hour(), hour(new Date(START + HOUR).toISOString())]),
      START
    );
    expect(entries.at(-1)?.date.getTime()).toBe(START + HOUR);
    expect(currentEntry(entries, START + HOUR)?.props.status).toBe('unavailable');
  });

  it('clears the gap before future data and does not substitute a future entry as current', () => {
    const future = timeline([hour(new Date(START + HOUR / 2).toISOString())]);
    const entries = toTimelineEntries(future, START);
    expect(currentEntry(entries, START)?.props.status).toBe('unavailable');
    expect(currentEntry(entries, START - 1)).toBeUndefined();
  });

  it('honours a shorter server validity boundary', () => {
    const source = timeline([
      { ...hour(), daylight: true, validUntil: new Date(START + HOUR / 2).toISOString() },
    ]);
    expect(isVerdictTimeline(source)).toBe(true);
    const entries = toTimelineEntries(source, START);
    expect(entries[0]?.props.footer).toContain('14:00–14:30');
    expect(currentEntry(entries, START + HOUR / 2)?.props.status).toBe('unavailable');
  });

  it('understands v2 darkness and rejects v1 payloads', () => {
    const time = '2026-12-21T17:00:00Z';
    const dark = {
      ...timeline([
        {
          ...hour(time),
          verdict: 'dark' as const,
          daylight: false,
          validUntil: '2026-12-21T18:00:00Z',
        },
      ]),
      schemaVersion: 2 as const,
      generatedAt: time,
    };
    delete dark.hours[0]?.board;
    expect(isVerdictTimeline(dark)).toBe(true);
    expect(toTimelineEntries(dark)[0]?.props.status).toBe('dark');
    const v1: Record<string, unknown> = { ...timeline([hour(time)]) };
    delete v1.schemaVersion;
    expect(isVerdictTimeline(v1)).toBe(false);
  });

  it.each([
    { ...hour(), waveHeightM: NaN },
    { ...hour(), time: 'bad date' },
    { ...hour(), validUntil: new Date(START).toISOString() },
  ])('rejects malformed timestamps or non-finite values', (bad) => {
    expect(isVerdictTimeline(timeline([bad]))).toBe(false);
  });

  it('rejects contradictory v2 daylight and unknown schema versions', () => {
    const source = {
      ...timeline([
        { ...hour(), daylight: false, validUntil: new Date(START + HOUR).toISOString() },
      ]),
      schemaVersion: 2,
    };
    expect(isVerdictTimeline(source)).toBe(false);
    expect(isVerdictTimeline({ ...timeline(), schemaVersion: 3 })).toBe(false);
  });

  it('rejects stale/future-generated sources and unknown spot locations', () => {
    expect(toTimelineEntries(timeline(), START + HOUR)[0]?.props.status).toBe('unavailable');
    expect(toTimelineEntries(timeline(), START - 1)[0]?.props.status).toBe('unavailable');
    expect(
      toTimelineEntries({ ...timeline(), spot: { id: 'unknown', name: 'Unknown' } }, START)[0]
        ?.props.status
    ).toBe('unavailable');
    expect(toTimelineEntries(timeline(), NaN)).toEqual([]);
  });

  it('uses a timestamped, non-actionable Android snapshot even when the forecast says GO', () => {
    const props = toAndroidSnapshot(timeline(), START + 10_000);
    expect(props.verdict).toBe('Open Tonnta');
    expect(props.irish).toBe('Forecast only');
    expect(props.board).toBe('');
    expect(props.reason).not.toContain('Worth going');
    expect(props.footer).toContain('Mon 14:00–15:00');
  });

  it('bounds time spent reading the response body as well as waiting for headers', async () => {
    const fetchImpl: typeof fetch = async () => {
      const response = Response.json({});
      response.json = () => new Promise<unknown>(() => {});
      return response;
    };
    await expect(
      fetchVerdictTimeline('https://worker.test/verdict', fetchImpl, 10)
    ).rejects.toThrow('no response within 10ms');
  });
});

describe('Widget refresh writes', () => {
  it('validates a fresh response against completion time, not request-start time', async () => {
    const target = sink();
    let now = START;
    const delayed: typeof fetch = async () => {
      now += 5_000;
      return Response.json({ ...timeline(), generatedAt: new Date(now - 1_000).toISOString() });
    };
    expect(
      await refreshWidgetContent('ios', target, 'https://worker.test/verdict', () => now, delayed)
    ).toBe(true);
    expect(target.updateTimeline).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          date: new Date(now),
          props: expect.objectContaining({ status: 'forecast' }),
        }),
      ])
    );
  });

  it('does not revive an expired response when the fetch crosses its validity limit', async () => {
    const target = sink();
    let now = START + HOUR - 1;
    const delayed: typeof fetch = async () => {
      now += 2;
      return Response.json(timeline());
    };
    expect(
      await refreshWidgetContent('ios', target, 'https://worker.test/verdict', () => now, delayed)
    ).toBe(false);
    expect(target.updateTimeline).toHaveBeenLastCalledWith([
      { date: new Date(now), props: expect.objectContaining({ status: 'unavailable' }) },
    ]);
  });

  it('hands the terminal expiry entry to iOS', async () => {
    const target = sink();
    expect(
      await refreshWidgetContent(
        'ios',
        target,
        'https://worker.test/verdict',
        START,
        fetchSource(timeline())
      )
    ).toBe(true);
    expect(target.updateTimeline).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          date: new Date(START + HOUR),
          props: expect.objectContaining({ status: 'unavailable', board: '' }),
        }),
      ])
    );
  });

  it('never writes an actionable Android snapshot', async () => {
    const target = sink();
    expect(
      await refreshWidgetContent(
        'android',
        target,
        'https://worker.test/verdict',
        START,
        fetchSource(timeline())
      )
    ).toBe(true);
    expect(target.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ verdict: 'Open Tonnta', board: '', irish: 'Forecast only' })
    );
  });

  it.each(['ios', 'android'])(
    'clears old recommendations after a failed %s refresh',
    async (platform) => {
      const target = sink();
      const failing: typeof fetch = async () => {
        throw new Error('offline');
      };
      expect(
        await refreshWidgetContent(platform, target, 'https://worker.test/verdict', START, failing)
      ).toBe(false);
      if (platform === 'ios')
        expect(target.updateTimeline).toHaveBeenCalledWith([
          {
            date: new Date(START),
            props: expect.objectContaining({ status: 'unavailable', board: '' }),
          },
        ]);
      else
        expect(target.updateSnapshot).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'unavailable', board: '' })
        );
    }
  );

  it.each(['ios', 'android'])('clears expired or missing-current data for %s', async (platform) => {
    const target = sink();
    expect(
      await refreshWidgetContent(
        platform,
        target,
        'https://worker.test/verdict',
        START + HOUR,
        fetchSource(timeline())
      )
    ).toBe(false);
    expect(platform === 'ios' ? target.updateTimeline : target.updateSnapshot).toHaveBeenCalled();
  });

  it('clears a previously displayed verdict before a pending network request completes', async () => {
    const target = sink();
    let finish: ((response: Response) => void) | undefined;
    const pending: typeof fetch = () =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      });
    const refresh = refreshWidgetContent(
      'ios',
      target,
      'https://worker.test/verdict',
      START,
      pending
    );
    expect(target.updateTimeline).toHaveBeenCalledWith([
      { date: new Date(START), props: expect.objectContaining({ status: 'unavailable' }) },
    ]);
    if (finish === undefined) throw new Error('request did not start');
    finish(Response.json(timeline()));
    await expect(refresh).resolves.toBe(true);
  });

  it('returns failure rather than claiming success if the native write fails', async () => {
    const target = sink();
    target.updateTimeline = () => {
      throw new Error('native unavailable');
    };
    expect(
      await refreshWidgetContent(
        'ios',
        target,
        'https://worker.test/verdict',
        START,
        fetchSource(timeline())
      )
    ).toBe(false);
  });
});
