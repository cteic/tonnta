import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { DiaryInsights, SessionConditions, SessionEntry } from './diary';
import { addEntry, createEntry, diaryInsights, parseDiary, serializeDiary } from './diary';

const feature = await loadFeature('./diary.feature');

function conditionsWith(overrides: Partial<SessionConditions> = {}): SessionConditions {
  return {
    waveHeightM: 0.6,
    wavePeriodS: 5,
    windSpeedKmh: 12,
    windState: 'cross-off',
    verdict: 'go',
    ...overrides,
  };
}

function goodSession(waveHeightM: number, timestamp: string): SessionEntry {
  return {
    id: `id-${timestamp}`,
    timestamp,
    spotId: 'donabate',
    conditions: conditionsWith({ waveHeightM }),
    rating: 'good',
  };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('A logged session round-trips through storage', ({ Given, When, Then }) => {
    let entry: SessionEntry | undefined;
    let parsed: SessionEntry[] = [];

    Given('a good longboard session in 0.6m cross-off waves', () => {
      entry = createEntry(
        {
          spotId: 'donabate',
          conditions: conditionsWith(),
          rating: 'good',
          board: 'longboard',
          note: 'lovely evening glass',
        },
        new Date('2026-07-04T18:00:00Z')
      );
    });
    When('I serialize the diary and parse it back', () => {
      if (entry === undefined) throw new Error('no entry');
      parsed = parseDiary(serializeDiary([entry]));
    });
    Then('the parsed diary contains that session unchanged', () => {
      expect(parsed).toEqual([entry]);
    });
  });

  Scenario('Junk in storage is dropped without crashing', ({ Given, When, Then }) => {
    let raw = '';
    let parsed: SessionEntry[] = [];

    Given('a storage payload with one valid session and assorted junk', () => {
      const valid = goodSession(0.5, '2026-07-01T08:00:00Z');
      raw = JSON.stringify([
        valid,
        null,
        42,
        'nonsense',
        { id: 'x', rating: 'amazing' },
        { ...valid, id: 7 },
      ]);
    });
    When('I parse the diary', () => {
      parsed = parseDiary(raw);
    });
    Then('only the valid session survives', () => {
      expect(parsed).toHaveLength(1);
      expect(parsed[0]?.id).toBe('id-2026-07-01T08:00:00Z');
    });
  });

  Scenario('A corrupted payload yields an empty diary', ({ Given, When, Then }) => {
    let raw = '';
    let parsed: SessionEntry[] = [];

    Given('a storage payload that is not valid JSON', () => {
      raw = '{not json at all';
    });
    When('I parse the diary', () => {
      parsed = parseDiary(raw);
    });
    Then('the diary is empty', () => {
      expect(parsed).toEqual([]);
    });
  });

  Scenario('Entries come back newest first', ({ Given, When, Then }) => {
    let raw = '';
    let parsed: SessionEntry[] = [];

    Given('three sessions logged on different days', () => {
      let entries: SessionEntry[] = [];
      entries = addEntry(entries, goodSession(0.4, '2026-07-01T08:00:00Z'));
      entries = addEntry(entries, goodSession(0.6, '2026-07-03T08:00:00Z'));
      entries = addEntry(entries, goodSession(0.5, '2026-07-02T08:00:00Z'));
      raw = serializeDiary(entries);
    });
    When('I parse the diary', () => {
      parsed = parseDiary(raw);
    });
    Then('the most recent session is first', () => {
      expect(parsed.map((entry) => entry.timestamp)).toEqual([
        '2026-07-03T08:00:00Z',
        '2026-07-02T08:00:00Z',
        '2026-07-01T08:00:00Z',
      ]);
    });
  });

  Scenario('No insights before three good sessions', ({ Given, When, Then }) => {
    let entries: SessionEntry[] = [];
    let insights: DiaryInsights | undefined;

    Given('two good sessions and one poor session', () => {
      entries = [
        goodSession(0.5, '2026-07-01T08:00:00Z'),
        goodSession(0.6, '2026-07-02T08:00:00Z'),
        { ...goodSession(0.3, '2026-07-03T08:00:00Z'), rating: 'poor' },
      ];
    });
    When('I ask for insights', () => {
      insights = diaryInsights(entries);
    });
    Then('there are no insights yet', () => {
      expect(insights).toBeUndefined();
    });
  });

  Scenario('Insights summarise what good sessions have in common', ({ Given, When, Then }) => {
    let entries: SessionEntry[] = [];
    let insights: DiaryInsights | undefined;

    Given('four good sessions around half a metre with cross-off wind', () => {
      entries = [
        goodSession(0.5, '2026-06-01T08:00:00Z'),
        goodSession(0.5, '2026-06-08T08:00:00Z'),
        goodSession(0.6, '2026-06-15T08:00:00Z'),
        goodSession(0.7, '2026-06-22T08:00:00Z'),
      ];
    });
    When('I ask for insights', () => {
      insights = diaryInsights(entries);
    });
    Then('the insights report a median near 0.55m and cross-off wind', () => {
      expect(insights?.goodCount).toBe(4);
      expect(insights?.medianWaveM).toBeCloseTo(0.55, 5);
      expect(insights?.minWaveM).toBe(0.5);
      expect(insights?.maxWaveM).toBe(0.7);
      expect(insights?.commonWindState).toBe('cross-off');
    });
  });

  Scenario('Notes are trimmed and capped', ({ Given, When, Then }) => {
    let note = '';
    let entry: SessionEntry | undefined;

    Given('a new session with a very long note', () => {
      note = `  ${'x'.repeat(900)}  `;
    });
    When('I create the entry', () => {
      entry = createEntry(
        {
          spotId: 'donabate',
          conditions: conditionsWith(),
          rating: 'grand',
          note,
        },
        new Date('2026-07-04T18:00:00Z')
      );
    });
    Then('the stored note is at most 500 characters', () => {
      expect(entry?.note?.length).toBeLessThanOrEqual(500);
      expect(entry?.note?.startsWith('x')).toBe(true);
    });
  });
});
