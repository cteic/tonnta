import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { colors } from '@tonnta/ui/theme';

import type { HourVerdict, VerdictTimeline, WidgetTimelineEntry } from './verdict-timeline';
import { currentEntry, fetchVerdictTimeline, toTimelineEntries } from './verdict-timeline';

const feature = await loadFeature('./verdict-timeline.feature');

const START = Date.parse('2026-10-20T15:00:00Z');
const HOUR_MS = 60 * 60 * 1000;

function hourAt(index: number, overrides: Partial<HourVerdict>): HourVerdict {
  return {
    time: new Date(START + index * HOUR_MS).toISOString().replace('.000Z', 'Z'),
    verdict: 'go',
    board: 'foamie',
    reason: '0.7m at 4s and the wind is manageable, worth going down.',
    waveHeightM: 0.68,
    wavePeriodS: 4.2,
    windSpeedKmh: 22.6,
    ...overrides,
  };
}

function timeline(first: Partial<HourVerdict>): VerdictTimeline {
  return {
    spot: { id: 'donabate', name: 'Donabate', irishName: 'Domhnach Bat' },
    generatedAt: new Date(START).toISOString(),
    hours: Array.from({ length: 24 }, (_, index) => hourAt(index, index === 0 ? first : {})),
  };
}

const FLAT: Partial<HourVerdict> = { verdict: 'flat', waveHeightM: 0.1, reason: 'Flat calm.' };

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'A GO hour shows the verdict, its Irish name and the board',
    ({ Given, When, Then, And }) => {
      let source: VerdictTimeline | undefined;
      let entries: WidgetTimelineEntry[] = [];

      Given('a timeline whose first hour is GO on a foamie', () => {
        source = timeline({});
      });
      When('I turn it into widget entries', () => {
        if (source === undefined) throw new Error('no timeline');
        entries = toTimelineEntries(source);
      });
      Then('the first entry reads "GO" under "Téigh"', () => {
        expect(entries[0]?.props.verdict).toBe('GO');
        expect(entries[0]?.props.irish).toBe('Téigh');
        expect(entries[0]?.props.detail).toBe('0.7m @ 4s · 23km/h');
      });
      And('the board line reads "Foamie day"', () => {
        expect(entries[0]?.props.board).toBe('Foamie day');
      });
      And('the verdict is drawn in dawn amber', () => {
        expect(entries[0]?.props.verdictColor).toBe(colors.dawnAmber);
        expect(entries[0]?.props.background).toBe(colors.seaClean);
      });
    }
  );

  Scenario('A flat hour uses ink text on the pale sea', ({ Given, When, Then, And }) => {
    let source: VerdictTimeline | undefined;
    let entries: WidgetTimelineEntry[] = [];

    Given('a timeline whose first hour is flat', () => {
      source = timeline(FLAT);
      const first = source.hours[0];
      if (first !== undefined) delete first.board;
    });
    When('I turn it into widget entries', () => {
      if (source === undefined) throw new Error('no timeline');
      entries = toTimelineEntries(source);
    });
    Then('the first entry reads "FLAT" under "Ciúin"', () => {
      expect(entries[0]?.props.verdict).toBe('FLAT');
      expect(entries[0]?.props.irish).toBe('Ciúin');
    });
    And('the board line is empty', () => {
      expect(entries[0]?.props.board).toBe('');
    });
    And('the text is ink, not fog', () => {
      expect(entries[0]?.props.background).toBe(colors.seaFlat);
      expect(entries[0]?.props.textColor).toBe(colors.inkOnLight);
      expect(entries[0]?.props.verdictColor).toBe(colors.inkOnLight);
    });
  });

  Scenario(
    'Entries are dated at the start of each hour and labelled in local time',
    ({ Given, When, Then, And }) => {
      let source: VerdictTimeline | undefined;
      let entries: WidgetTimelineEntry[] = [];

      Given('a timeline whose first hour is GO on a foamie', () => {
        source = timeline({});
      });
      When('I turn it into widget entries', () => {
        if (source === undefined) throw new Error('no timeline');
        entries = toTimelineEntries(source);
      });
      Then('there is one entry per hour', () => {
        expect(entries).toHaveLength(24);
        expect((entries[1]?.date.getTime() ?? 0) - (entries[0]?.date.getTime() ?? 0)).toBe(HOUR_MS);
      });
      And('the first entry is dated 15:00 UTC', () => {
        expect(entries[0]?.date.toISOString()).toBe('2026-10-20T15:00:00.000Z');
      });
      And('its footer reads "Donabate · 16:00"', () => {
        // Irish Standard Time on 20 October: UTC+1.
        expect(entries[0]?.props.footer).toBe('Donabate · 16:00');
      });
    }
  );

  Scenario('The current entry is the hour that contains now', ({ Given, When, Then }) => {
    let entries: WidgetTimelineEntry[] = [];
    let picked: WidgetTimelineEntry | undefined;

    Given('a timeline whose first hour is GO on a foamie', () => {
      entries = toTimelineEntries(timeline({}));
    });
    When('I pick the entry for 16:40 UTC', () => {
      picked = currentEntry(entries, Date.parse('2026-10-20T16:40:00Z'));
    });
    Then('the picked entry is dated 16:00 UTC', () => {
      expect(picked?.date.toISOString()).toBe('2026-10-20T16:00:00.000Z');
    });
  });

  Scenario('A malformed response is rejected', ({ Given, When, Then }) => {
    let fetchImpl: typeof fetch = fetch;
    let failure: unknown;

    Given('an endpoint that returns hours without a verdict', () => {
      const body = {
        ...timeline({}),
        hours: [{ time: '2026-10-20T15:00:00Z', reason: 'no verdict' }],
      };
      fetchImpl = async () => new Response(JSON.stringify(body), { status: 200 });
    });
    When('the widget fetches the timeline', async () => {
      failure = await fetchVerdictTimeline('https://worker.test/verdict', fetchImpl).catch(
        (error: unknown) => error
      );
    });
    Then('the fetch fails with "unexpected response shape"', () => {
      expect(failure).toBeInstanceOf(Error);
      expect(failure instanceof Error ? failure.message : '').toContain(
        'unexpected response shape'
      );
    });
  });

  Scenario('A stalled endpoint times out', ({ Given, When, Then }) => {
    let fetchImpl: typeof fetch = fetch;
    let failure: unknown;

    Given('an endpoint that never responds', () => {
      fetchImpl = (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
    });
    When('the widget fetches the timeline with a 20ms timeout', async () => {
      failure = await fetchVerdictTimeline('https://worker.test/verdict', fetchImpl, 20).catch(
        (error: unknown) => error
      );
    });
    Then('the fetch fails with "no response within 20ms"', () => {
      expect(failure instanceof Error ? failure.message : '').toContain('no response within 20ms');
    });
  });

  Scenario('An endpoint that stalls after its headers times out', ({ Given, When, Then }) => {
    let fetchImpl: typeof fetch = fetch;
    let failure: unknown;

    Given('an endpoint that sends headers and then never finishes the body', () => {
      fetchImpl = async (_input, init) => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"spot":'));
            init?.signal?.addEventListener('abort', () => controller.error(new Error('aborted')));
          },
        });
        return new Response(body, { status: 200 });
      };
    });
    When('the widget fetches the timeline with a 20ms timeout', async () => {
      failure = await fetchVerdictTimeline('https://worker.test/verdict', fetchImpl, 20).catch(
        (error: unknown) => error
      );
    });
    Then('the fetch fails with "no response within 20ms"', () => {
      expect(failure instanceof Error ? failure.message : '').toContain('no response within 20ms');
    });
  });
});
