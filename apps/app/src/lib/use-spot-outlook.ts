import { useEffect, useState } from 'react';

import { AppState } from 'react-native';

import type { SpotOutlook } from './conditions';
import { loadSpotOutlook } from './conditions';

export type OutlookState =
  | { status: 'loading' }
  | { status: 'ready'; outlook: SpotOutlook }
  | { status: 'error'; message: string };

/** Refresh while foregrounded and on return; stale results from a previous spot are dropped. */
export function useSpotOutlook(spotId: string): OutlookState {
  const [state, setState] = useState<OutlookState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let loading = false;
    let lastLoadedAt = 0;
    const refresh = async () => {
      if (loading || cancelled) return;
      loading = true;
      setState({ status: 'loading' });
      try {
        const outlook = await loadSpotOutlook(spotId);
        if (!cancelled) {
          lastLoadedAt = outlook.loadedAt;
          setState({ status: 'ready', outlook });
        }
      } catch (error: unknown) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'The forecast is unavailable right now.';
          setState({ status: 'error', message });
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
