import { useEffect, useState } from 'react';

import { AppState } from 'react-native';

import { fetchBuoyObservation } from '@tonnta/data';
import type { BuoyObservation } from '@tonnta/types';

export type BuoyState =
  | { status: 'loading' }
  | { status: 'ready'; observation: BuoyObservation | undefined }
  | { status: 'error'; previous?: BuoyObservation };

const REFRESH_MS = 15 * 60_000;

/** Latest buoy reading, refreshed while foregrounded and on return to the app. */
export function useBuoy(stationId: string | undefined): BuoyState {
  const [state, setState] = useState<BuoyState>({ status: 'loading' });

  useEffect(() => {
    if (stationId === undefined) {
      setState({ status: 'ready', observation: undefined });
      return undefined;
    }
    let cancelled = false;
    let previous: BuoyObservation | undefined;
    const refresh = async () => {
      try {
        const observation = await fetchBuoyObservation(stationId);
        if (cancelled) return;
        previous = observation ?? previous;
        setState({ status: 'ready', observation });
      } catch {
        if (!cancelled)
          setState(previous === undefined ? { status: 'error' } : { status: 'error', previous });
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
    };
  }, [stationId]);

  return state;
}
