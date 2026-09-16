import { useEffect, useState } from 'react';

import type { SpotOutlook } from './conditions';
import { loadSpotOutlook } from './conditions';

export type OutlookState =
  | { status: 'loading' }
  | { status: 'ready'; outlook: SpotOutlook }
  | { status: 'error'; message: string };

/** Loads the outlook for a spot on mount; stale results from a previous spot are dropped. */
export function useSpotOutlook(spotId: string): OutlookState {
  const [state, setState] = useState<OutlookState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadSpotOutlook(spotId)
      .then((outlook) => {
        if (!cancelled) {
          setState({ status: 'ready', outlook });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : 'The forecast is unavailable right now.';
          setState({ status: 'error', message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [spotId]);

  return state;
}
