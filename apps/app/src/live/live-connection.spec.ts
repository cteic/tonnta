import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { LiveFetch, LiveResponse, LiveStatus, Schedule } from './live-connection';
import { createLiveConnection } from './live-connection';

const feature = await loadFeature('./live-connection.feature');

function streamOf(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

async function settle(): Promise<void> {
  for (let tick = 0; tick < 10; tick += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('The stream reopens after the server closes it', ({ Given, When, Then, And }) => {
    const statuses: LiveStatus[] = [];
    const scheduled: number[] = [];
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
      const schedule: Schedule = (_run, ms) => {
        scheduled.push(ms);
        return () => {};
      };
      createLiveConnection({
        url: 'https://worker.test/live',
        fetchImpl,
        onMessage: () => {},
        onStatus: (status) => statuses.push(status),
        schedule,
      }).resume();
      await settle();
    });
    Then('the status goes live, then reconnecting', () => {
      expect(statuses).toEqual(['live', 'reconnecting']);
    });
    And('a reconnect is scheduled after 1200ms', () => {
      expect(scheduled).toEqual([1200]);
    });
  });

  Scenario(
    'A stopped connection that fails late does not open a second stream',
    ({ Given, When, Then, And }) => {
      const scheduled: number[] = [];
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
        const schedule: Schedule = (_run, ms) => {
          scheduled.push(ms);
          return () => {};
        };
        const connection = createLiveConnection({
          url: 'https://worker.test/live',
          fetchImpl,
          onMessage: () => {},
          onStatus: () => {},
          schedule,
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
        expect(scheduled).toEqual([]);
      });
      And('only two requests were made', () => {
        expect(requests).toBe(2);
      });
    }
  );
});
