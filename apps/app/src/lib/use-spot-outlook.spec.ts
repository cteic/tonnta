import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

import { getSpot } from '@tonnta/data';

import type { SpotOutlook } from './conditions';
import { outlookRefreshState } from './use-spot-outlook';

vi.mock('react-native', () => ({ AppState: {} }));

const spot = getSpot('donabate');
if (spot === undefined) throw new Error('Donabate missing');
const restricted: SpotOutlook = {
  spot,
  loadedAt: 1_000,
  forecastHours: [],
  now: { verdict: 'flat', reason: 'No forecast' },
  headline: { kind: 'none' },
  days: [],
  hours: [],
  tides: [],
  swimNow: { verdict: 'no', reason: 'Bathing restriction', nearHighTide: false },
  swimWindows: [],
  waterQuality: { beachId: 'test', beachName: 'Test', restrictionInPlace: true },
  waterQualityCheck: { status: 'checked', checkedAt: 900 },
  waterQualityStatus: 'restricted',
};

describe('Native restricted-outlook refresh state', () => {
  it.each(['loading', 'error'] as const)(
    'retains the visible restriction during %s without renewing timestamps',
    (phase) => {
      const state = outlookRefreshState(restricted, phase);
      expect(state.status).toBe('ready');
      if (state.status !== 'ready') throw new Error('Restriction hidden');
      expect(state.outlook.waterQuality).toBe(restricted.waterQuality);
      expect(state.outlook.swimNow).toBe(restricted.swimNow);
      expect(state.outlook.loadedAt).toBe(1_000);
      expect(state.outlook.waterQualityCheck).toEqual({ status: 'checked', checkedAt: 900 });
      expect(state.outlook.refreshWarning).toContain(
        phase === 'loading' ? 'Refreshing' : 'could not be refreshed'
      );
    }
  );

  it('preserves ordinary loading/error states without a known restriction', () => {
    expect(outlookRefreshState(undefined, 'loading')).toEqual({ status: 'loading' });
    expect(outlookRefreshState(undefined, 'error', 'Offline')).toEqual({
      status: 'error',
      message: 'Offline',
    });
  });

  it('uses retention on both hook transitions and renders its disclosure', () => {
    const hook = readFileSync(new URL('./use-spot-outlook.ts', import.meta.url), 'utf8');
    const view = readFileSync(new URL('../components/outlook-view.tsx', import.meta.url), 'utf8');
    expect(hook).toContain("setState(outlookRefreshState(lastOutlook, 'loading'))");
    expect(hook).toContain("setState(outlookRefreshState(lastOutlook, 'error', message))");
    expect(view).toContain('<Body>{outlook.refreshWarning}</Body>');
  });
});
