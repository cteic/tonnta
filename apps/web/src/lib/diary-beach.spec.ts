import { createElement } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SessionLogger } from '@/components/diary/session-logger';

import {
  BEACH_REPORT_STORAGE_KEY,
  DIARY_STORAGE_KEY,
  createBeachReport,
  createEntry,
  parseBeachReport,
  parseDiary,
  persistBeachReports,
  readBeachReports,
  removeLegacyEntry,
  serializeDiary,
  visitLocalTime,
  visitTimeCandidates,
} from './diary';
import type { BeachReportInput } from './diary';
import { FORECAST_STORAGE_KEY, captureForecastSnapshots } from './forecast-snapshots';
import type { LocalStorageLike } from './forecast-snapshots';

const VISIT: BeachReportInput = {
  spotId: 'donabate',
  observedAt: '2026-11-09T12:30:00.000Z',
  visitKind: 'checked',
  observedSurf: 'flat',
};
const NOW = new Date('2026-11-09T16:00:00Z');
function store(): LocalStorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('private beach reports', () => {
  it('records a beach check without any forecast or surf session', () => {
    const report = createBeachReport(VISIT, [], NOW);
    expect(report.observedAt).toBe(VISIT.observedAt);
    expect(report.submittedAt).toBe(NOW.toISOString());
    expect(report.visitKind).toBe('checked');
    expect(report.forecast).toBeUndefined();
    expect(report.rating).toBeUndefined();
    expect(report.id).toMatch(/^[a-f0-9-]{36}$/);
  });
  it('keeps enjoyment separate from observed surf and optional fields', () => {
    const report = createBeachReport(
      {
        ...VISIT,
        observedSurf: 'small',
        goodEnough: true,
        rating: 'good',
        board: 'longboard',
        note: '  still fun  ',
      },
      [],
      NOW
    );
    expect(report.observedSurf).toBe('small');
    expect(report.goodEnough).toBe(true);
    expect(report.rating).toBe('good');
    expect(report.note).toBe('still fun');
  });
  it('embeds the original comparison and never rematches an unmatched report', async () => {
    const snapshots = await captureForecastSnapshots({
      spotId: 'donabate',
      checkedAt: Date.parse('2026-11-09T10:00Z'),
      capturedAt: Date.parse('2026-11-09T10:01Z'),
      engineVersion: 'original-v1',
      hours: [
        {
          hour: {
            time: '2026-11-09T12:00:00Z',
            waveHeightM: 0.7,
            wavePeriodS: 5,
            waveDirectionDeg: 80,
            windSpeedKmh: 10,
            windGustKmh: 15,
            windDirectionDeg: 250,
            windState: 'offshore',
          },
          verdict: { verdict: 'go', reason: 'Original call' },
        },
      ],
    });
    const matched = createBeachReport(VISIT, snapshots, NOW);
    const unmatched = createBeachReport(VISIT, [], NOW);
    const storage = store();
    expect(persistBeachReports(storage, [matched, unmatched]).ok).toBe(true);
    expect(readBeachReports(storage)).toEqual({ ok: true, value: [matched, unmatched] });
    storage.setItem(FORECAST_STORAGE_KEY, '[]');
    expect(readBeachReports(storage)).toEqual({ ok: true, value: [matched, unmatched] });
    expect(matched.forecast?.verdict.reason).toBe('Original call');
    expect(unmatched.forecast).toBeUndefined();
    expect(parseBeachReport({ ...matched, spotId: 'el-cotillo' })?.forecast).toBeUndefined();
  });
  it('preserves legacy data without promoting it to a verified beach report', () => {
    const entry = createEntry(
      {
        spotId: 'donabate',
        rating: 'good',
        conditions: {
          waveHeightM: 0.5,
          wavePeriodS: 5,
          windSpeedKmh: 10,
          windState: 'offshore',
          verdict: 'go',
        },
      },
      NOW
    );
    const storage = store();
    storage.setItem(DIARY_STORAGE_KEY, serializeDiary([entry]));
    persistBeachReports(storage, [createBeachReport(VISIT, [], NOW)]);
    expect(parseDiary(storage.getItem(DIARY_STORAGE_KEY))).toEqual([entry]);
    expect(parseBeachReport(entry)).toBeUndefined();
  });
  it('removes only the requested legacy session using the latest stored history', () => {
    const conditions = {
      waveHeightM: 0.5,
      wavePeriodS: 5,
      windSpeedKmh: 10,
      windState: 'offshore' as const,
      verdict: 'go' as const,
    };
    const old = createEntry({ spotId: 'donabate', rating: 'good', conditions }, NOW);
    const other = createEntry(
      { spotId: 'donabate', rating: 'poor', conditions },
      new Date('2026-11-08T12:00Z')
    );
    const storage = store();
    storage.setItem(DIARY_STORAGE_KEY, serializeDiary([old, other]));
    const reports = [createBeachReport(VISIT, [], NOW)];
    persistBeachReports(storage, reports);
    expect(removeLegacyEntry(storage, old.id)).toEqual({ ok: true, value: [other] });
    expect(parseDiary(storage.getItem(DIARY_STORAGE_KEY))).toEqual([other]);
    expect(readBeachReports(storage)).toEqual({ ok: true, value: reports });
  });
  it('never claims legacy deletion after storage failure or erases malformed history', () => {
    const storage = store();
    storage.setItem(DIARY_STORAGE_KEY, '[{"broken":true}]');
    expect(removeLegacyEntry(storage, 'missing').ok).toBe(false);
    expect(storage.getItem(DIARY_STORAGE_KEY)).toBe('[{"broken":true}]');
    const denied = {
      getItem: () => '[]',
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(removeLegacyEntry(denied, 'missing').ok).toBe(false);
  });
  it('rejects future visits and unknown beaches', () => {
    expect(() =>
      createBeachReport({ ...VISIT, observedAt: '2026-11-10T12:00Z' }, [], NOW)
    ).toThrow();
    expect(() => createBeachReport({ ...VISIT, spotId: 'unknown' }, [], NOW)).toThrow();
  });
  it('never reports success after write failure and leaves malformed stores unchanged', () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error('full');
      },
    };
    const result = persistBeachReports(broken, [createBeachReport(VISIT, [], NOW)]);
    expect(result.ok).toBe(false);
    const storage = store();
    storage.setItem(BEACH_REPORT_STORAGE_KEY, '[{"bad":true}]');
    expect(readBeachReports(storage).ok).toBe(false);
    expect(storage.getItem(BEACH_REPORT_STORAGE_KEY)).toBe('[{"bad":true}]');
  });
  it('labels device-only storage and separates observed conditions from personal ratings', () => {
    const html = renderToStaticMarkup(createElement(SessionLogger, { spotId: 'el-cotillo' }));
    expect(html).toContain('What did the surf look like?');
    expect(html).toContain('Personal session rating (optional)');
    expect(html).toContain('Good enough for me?');
    expect(html).toContain('Atlantic/Canary');
    expect(html).toContain('No saved forecast for this visit');
    expect(html).toContain('Download my log');
    expect(html).not.toContain('sweet spot');
  });
});

describe('beach-local visit time', () => {
  it('round-trips winter and summer dates without using the browser timezone', () => {
    expect(visitTimeCandidates('2026-07-04T18:30', 'Europe/Dublin')).toEqual([
      '2026-07-04T17:30:00.000Z',
    ]);
    expect(visitLocalTime('2026-11-09T12:30:00Z', 'Atlantic/Canary')).toBe('2026-11-09T12:30');
  });
  it('rejects nonexistent DST times and presents both repeated-time candidates', () => {
    expect(visitTimeCandidates('2026-03-29T01:30', 'Europe/Dublin')).toEqual([]);
    expect(visitTimeCandidates('2026-10-25T01:30', 'Europe/Dublin')).toEqual([
      '2026-10-25T00:30:00.000Z',
      '2026-10-25T01:30:00.000Z',
    ]);
  });
  it('rejects invalid calendar input rather than silently normalising', () => {
    expect(visitTimeCandidates('2026-02-30T12:00', 'Europe/Dublin')).toEqual([]);
    expect(visitTimeCandidates('', 'Europe/Dublin')).toEqual([]);
  });
});
