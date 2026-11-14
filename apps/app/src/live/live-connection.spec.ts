import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { LiveFetch, LiveResponse, LiveStatus, Schedule } from './live-connection';
import { STALL_TIMEOUT_MS, createLiveConnection } from './live-connection';

const feature = await loadFeature('./live-connection.feature');

function streamOf(...chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
}

/** A stream that sends `text` and then stays open until the request is aborted. */
function openStreamOf(text: string, signal: AbortSignal): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      signal.addEventListener('abort', () => controller.error(new Error('aborted')));
    },
  });
}

interface Timer {
  ms: number;
  run: () => void;
  cancelled: boolean;
}

/** Records timers instead of running them. Reconnects are the timers that are not watchdogs. */
function recordingSchedule(timers: Timer[]): Schedule {
  return (run, ms) => {
    const timer: Timer = { ms, run, cancelled: false };
    timers.push(timer);
    return () => {
      timer.cancelled = true;
    };
  };
}

function reconnects(timers: Timer[]): number[] {
  return timers.filter((timer) => timer.ms !== STALL_TIMEOUT_MS).map((timer) => timer.ms);
}

async function settle(): Promise<void> {
  for (let tick = 0; tick < 10; tick += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('The stream reopens after the server closes it', ({ Given, When, Then, And }) => {
    const statuses: LiveStatus[] = [];
    const timers: Timer[] = [];
    let fetchImpl: LiveFetch | undefined;

    Given('a server that sends a snapshot with a 1200ms retry hint and closes', () => {
      fetchImpl = async () => ({
        ok: true,
        status: 200,
        body: streamOf('retry: 1200\n\nevent: snapshot\ndata: {}\n\n'),
      });
    });
    When('the connection opens', async () => {
      if (fetchImpl === undefined) throw new Error('no server');
      createLiveConnection({
        url: 'https://worker.test/live',
        fetchImpl,
        onMessage: () => {},
        onStatus: (status) => statuses.push(status),
        schedule: recordingSchedule(timers),
      }).resume();
      await settle();
    });
    Then('the status goes live, then reconnecting', () => {
      expect(statuses).toEqual(['live', 'reconnecting']);
    });
    And('a reconnect is scheduled after 1200ms', () => {
      expect(reconnects(timers)).toEqual([1200]);
    });
  });

  Scenario(
    'A stopped connection that fails late does not open a second stream',
    ({ Given, When, Then, And }) => {
      const timers: Timer[] = [];
      const lateRejections: (() => void)[] = [];
      let requests = 0;
      let fetchImpl: LiveFetch | undefined;

      Given('a server whose aborted requests reject only when told to', () => {
        fetchImpl = () => {
          requests += 1;
          return new Promise<LiveResponse>((_resolve, reject) => {
            lateRejections.push(() => reject(new Error('aborted')));
          });
        };
      });
      When('the connection opens, pauses and resumes', async () => {
        if (fetchImpl === undefined) throw new Error('no server');
        const connection = createLiveConnection({
          url: 'https://worker.test/live',
          fetchImpl,
          onMessage: () => {},
          onStatus: () => {},
          schedule: recordingSchedule(timers),
        });
        connection.resume();
        connection.pause();
        connection.resume();
        await settle();
      });
      And("the first request's rejection finally arrives", async () => {
        lateRejections[0]?.();
        await settle();
      });
      Then('no reconnect is scheduled', () => {
        expect(reconnects(timers)).toEqual([]);
      });
      And('only two requests were made', () => {
        expect(requests).toBe(2);
      });
    }
  );

  Scenario(
    'A connection that goes silent is dropped and reopened',
    ({ Given, When, Then, And }) => {
      const statuses: LiveStatus[] = [];
      const timers: Timer[] = [];
      let fetchImpl: LiveFetch | undefined;

      Given('a server that sends a snapshot and then nothing, without closing', () => {
        fetchImpl = async (_url, { signal }) => ({
          ok: true,
          status: 200,
          body: openStreamOf('event: snapshot\ndata: {}\n\n', signal),
        });
      });
      When('the connection opens and a minute passes with no data', async () => {
        if (fetchImpl === undefined) throw new Error('no server');
        createLiveConnection({
          url: 'https://worker.test/live',
          fetchImpl,
          onMessage: () => {},
          onStatus: (status) => statuses.push(status),
          schedule: recordingSchedule(timers),
        }).resume();
        await settle();
        const watchdog = timers
          .filter((timer) => timer.ms === STALL_TIMEOUT_MS && !timer.cancelled)
          .at(-1);
        watchdog?.run();
        await settle();
      });
      Then('the status goes live, then reconnecting', () => {
        expect(statuses).toEqual(['live', 'reconnecting']);
      });
      And('a reconnect is scheduled after 5000ms', () => {
        expect(reconnects(timers)).toEqual([5000]);
      });
    }
  );

  Scenario('Every chunk counts as activity, heartbeats included', ({ Given, When, Then }) => {
    const activity: number[] = [];
    let clock = 1_000;
    let fetchImpl: LiveFetch | undefined;

    Given('a server that sends a snapshot, then a heartbeat, then closes', () => {
      fetchImpl = async () => ({
        ok: true,
        status: 200,
        body: streamOf('event: snapshot\ndata: {}\n\n', ': ping\n\n'),
      });
    });
    When('the connection opens', async () => {
      if (fetchImpl === undefined) throw new Error('no server');
      createLiveConnection({
        url: 'https://worker.test/live',
        fetchImpl,
        onMessage: () => {},
        onStatus: () => {},
        onActivity: (at) => activity.push(at),
        schedule: recordingSchedule([]),
        now: () => {
          clock += 1_000;
          return clock;
        },
      }).resume();
      await settle();
    });
    Then('activity is reported once per chunk, at the time it arrived', () => {
      expect(activity).toEqual([2_000, 3_000]);
    });
  });
});
