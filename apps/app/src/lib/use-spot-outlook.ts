import { useEffect, useState } from 'react';

import { AppState } from 'react-native';

import type { SpotOutlook } from './conditions';
import { loadSpotOutlook, retainKnownWaterQualityRestriction } from './conditions';

export type OutlookState =
  | { status: 'loading' }
  | { status: 'ready'; outlook: SpotOutlook }
  | { status: 'error'; message: string };

/** Keep a known restriction visible while refreshing, including forecast failures. */
export function outlookRefreshState(
  previous: SpotOutlook | undefined,
  phase: 'loading' | 'error',
  message = 'The forecast is unavailable right now.'
): OutlookState {
  if (previous?.waterQuality?.restrictionInPlace === true) {
    return {
      status: 'ready',
      outlook: {
        ...previous,
        refreshWarning:
          phase === 'loading'
            ? 'Refreshing conditions. The previously retrieved bathing restriction has not been confirmed lifted.'
            : 'Conditions could not be refreshed. Showing previously retrieved data; the bathing restriction has not been confirmed lifted. Check current local advice.',
      },
    };
  }
  return phase === 'loading' ? { status: 'loading' } : { status: 'error', message };
}

/** Refresh while foregrounded and on return; stale results from a previous spot are dropped. */
export function useSpotOutlook(spotId: string): OutlookState {
  const [state, setState] = useState<OutlookState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let loading = false;
    let lastLoadedAt = 0;
    let lastOutlook: SpotOutlook | undefined;
    const refresh = async () => {
      if (loading || cancelled) return;
      loading = true;
      setState(outlookRefreshState(lastOutlook, 'loading'));
      try {
        const downloaded = await loadSpotOutlook(spotId);
        if (!cancelled) {
          const outlook = retainKnownWaterQualityRestriction(downloaded, lastOutlook, Date.now());
          lastOutlook = outlook;
          lastLoadedAt = outlook.loadedAt;
          setState({ status: 'ready', outlook });
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'The forecast is unavailable right now.';
          setState(outlookRefreshState(lastOutlook, 'error', message));
        }
      } finally {
        loading = false;
      }
    };
    void refresh();
    const refreshIfDue = () => {
      if (Date.now() - lastLoadedAt >= 15 * 60_000) void refresh();
    };
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refreshIfDue();
    }, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshIfDue();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [spotId]);

  return state;
}
