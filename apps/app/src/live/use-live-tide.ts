import { useEffect, useReducer, useState } from 'react';

import { AppState } from 'react-native';

import { fetch } from 'expo/fetch';

import type { LiveStatus } from './live-connection';
import { createLiveConnection } from './live-connection';
import type { LiveTideState } from './live-tide';
import { EMPTY_LIVE_TIDE, applyLiveMessage } from './live-tide';

export type { LiveStatus } from './live-connection';

/** The worker's live stream. Override to point a dev build at `wrangler dev`. */
export const LIVE_URL =
  process.env.EXPO_PUBLIC_LIVE_URL ?? 'https://tonnta-worker.pete-9c4.workers.dev/live';

/**
 * Hold a live connection to the spot's tide gauge while the app is in the
 * foreground. The server closes the stream every 15 minutes and the hook
 * reconnects; failures back off exponentially up to 30 seconds.
 */
export function useLiveTide(spotId: string): { state: LiveTideState; status: LiveStatus } {
  const [state, dispatch] = useReducer(applyLiveMessage, EMPTY_LIVE_TIDE);
  const [status, setStatus] = useState<LiveStatus>('connecting');

  useEffect(() => {
    const connection = createLiveConnection({
      url: `${LIVE_URL}?spot=${encodeURIComponent(spotId)}`,
      fetchImpl: fetch,
      onMessage: dispatch,
      onStatus: setStatus,
    });
    if (AppState.currentState === 'active') connection.resume();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        connection.resume();
      } else {
        connection.pause();
      }
    });

    return () => {
      subscription.remove();
      connection.pause();
    };
  }, [spotId]);

  return { state, status };
}
