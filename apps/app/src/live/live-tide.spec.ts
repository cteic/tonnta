import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { LiveTideState } from './live-tide';
import { EMPTY_LIVE_TIDE, applyLiveMessage, formatLevel, formatSince } from './live-tide';
import type { SseMessage, SseParser } from './sse';
import { createSseParser } from './sse';

const feature = await loadFeature('./live-tide.feature');

const START = Date.parse('2026-10-20T15:10:00Z');
const STEP_MS = 5 * 60 * 1000;

function readings(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    time: new Date(START + index * STEP_MS).toISOString().replace('.000Z', 'Z'),
    levelM: Number((0.2 + index * 0.02).toFixed(3)),
  }));
}

function snapshotMessage(count: number): SseMessage {
  return {
    event: 'snapshot',
    data: JSON.stringify({ gauge: 'Skerries Harbour', readings: readings(count), trend: 'rising' }),
  };
}

const STREAM =
  'retry: 5000\n\n' +
  'event: snapshot\nid: 2026-10-20T16:10:00Z\n' +
  `data: ${JSON.stringify({ gauge: 'Skerries Harbour', readings: readings(2), trend: null })}\n\n` +
  ': ping\n\n' +
  'event: reading\r\nid: 2026-10-20T16:15:00Z\r\n' +
  'data: {"time":"2026-10-20T16:15:00Z","levelM":0.44,"trend":"rising"}\r\n\r\n';

describeFeature(feature, ({ Scenario }) => {
  Scenario('Events split across network chunks are reassembled', ({ Given, When, Then, And }) => {
    const messages: SseMessage[] = [];
    let parser: SseParser | undefined;
    let chunks: string[] = [];
    Given('a stream that arrives in three arbitrary chunks', () => {
      // Cut inside a field name and between the \r and \n of a line ending.
      const cutA = STREAM.indexOf('snap') + 2;
      const cutB = STREAM.indexOf('\r\n') + 1;
      chunks = [STREAM.slice(0, cutA), STREAM.slice(cutA, cutB), STREAM.slice(cutB)];
    });
    When('the parser reads them', () => {
      parser = createSseParser((message) => messages.push(message));
      for (const chunk of chunks) parser.push(chunk);
    });
    Then('it dispatches one snapshot event and one reading event', () => {
      expect(messages.map((message) => message.event)).toEqual(['snapshot', 'reading']);
      expect(JSON.parse(messages[1]?.data ?? '{}')).toEqual({
        time: '2026-10-20T16:15:00Z',
        levelM: 0.44,
        trend: 'rising',
      });
    });
    And("it remembers the server's retry interval and last event id", () => {
      expect(parser?.retryMs()).toBe(5000);
      expect(parser?.lastEventId()).toBe('2026-10-20T16:15:00Z');
    });
  });

  Scenario('Comments and heartbeats dispatch nothing', ({ Given, When, Then }) => {
    const messages: SseMessage[] = [];
    let stream = '';
    Given('a stream of only heartbeat comments', () => {
      stream = ': ping\n\n: ping\n\n';
    });
    When('the parser reads it', () => {
      createSseParser((message) => messages.push(message)).push(stream);
    });
    Then('no events are dispatched', () => {
      expect(messages).toHaveLength(0);
    });
  });

  Scenario('A snapshot replaces the state with the last hour', ({ Given, When, Then, And }) => {
    let state: LiveTideState = EMPTY_LIVE_TIDE;
    Given('an empty live tide state', () => {
      state = EMPTY_LIVE_TIDE;
    });
    When('a snapshot with 14 readings over 65 minutes arrives', () => {
      state = applyLiveMessage(state, snapshotMessage(14));
    });
    Then('the state keeps the readings from the last hour', () => {
      expect(state.readings).toHaveLength(13);
      expect(state.readings[0]?.time).toBe('2026-10-20T15:15:00Z');
      expect(state.gauge).toBe('Skerries Harbour');
    });
    And('the trend is "rising"', () => {
      expect(state.trend).toBe('rising');
    });
  });

  Scenario('A new reading is appended once', ({ Given, When, Then }) => {
    let state: LiveTideState = EMPTY_LIVE_TIDE;
    Given('a live tide state from a snapshot', () => {
      state = applyLiveMessage(EMPTY_LIVE_TIDE, snapshotMessage(3));
    });
    When('the same new reading arrives twice', () => {
      const message: SseMessage = {
        event: 'reading',
        data: '{"time":"2026-10-20T15:25:00Z","levelM":0.26,"trend":"rising"}',
      };
      state = applyLiveMessage(applyLiveMessage(state, message), message);
    });
    Then('it is appended once', () => {
      expect(state.readings.map((reading) => reading.levelM)).toEqual([0.2, 0.22, 0.24, 0.26]);
    });
  });

  Scenario('A malformed event is ignored', ({ Given, When, Then }) => {
    let before: LiveTideState = EMPTY_LIVE_TIDE;
    let after: LiveTideState = EMPTY_LIVE_TIDE;
    Given('a live tide state from a snapshot', () => {
      before = applyLiveMessage(EMPTY_LIVE_TIDE, snapshotMessage(3));
    });
    When('a reading arrives without a level', () => {
      after = applyLiveMessage(before, {
        event: 'reading',
        data: '{"time":"2026-10-20T15:25:00Z"}',
      });
    });
    Then('the state is unchanged', () => {
      expect(after).toBe(before);
    });
  });

  Scenario('Levels print signed, like a tide table', ({ Then }) => {
    Then('0.439 prints as "+0.44 m" and -0.12 prints as "−0.12 m"', () => {
      expect(formatLevel(0.439)).toBe('+0.44 m');
      expect(formatLevel(-0.12)).toBe('−0.12 m');
    });
  });

  Scenario('The status line says how long ago the stream last spoke', ({ Then }) => {
    Then(
      '2 seconds prints as "just now", 18 seconds as "18s ago" and 150 seconds as "2 min ago"',
      () => {
        expect(formatSince(2_000)).toBe('just now');
        expect(formatSince(18_000)).toBe('18s ago');
        expect(formatSince(150_000)).toBe('2 min ago');
      }
    );
  });
});
