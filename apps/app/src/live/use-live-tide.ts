import { useEffect, useReducer, useState } from 'react';

import { AppState } from 'react-native';

import { fetch } from 'expo/fetch';

import type { LiveTideState } from './live-tide';
import { EMPTY_LIVE_TIDE, applyLiveMessage } from './live-tide';
import type { SseMessage } from './sse';
import { createSseParser } from './sse';

/** The worker's live stream. Override to point a dev build at `wrangler dev`. */
export const LIVE_URL =
  process.env.EXPO_PUBLIC_LIVE_URL ?? 'https://tonnta-worker.pete-9c4.workers.dev/live';

export type LiveStatus = 'connecting' | 'live' | 'reconnecting';

const DEFAULT_RETRY_MS = 5_000;
const MAX_BACKOFF_MS = 30_000;

/**
 * Hold a live connection to the spot's tide gauge while the app is in the
 * foreground. The server closes the stream every 15 minutes and the hook
 * reconnects; failures back off exponentially up to 30 seconds.
 */
export function useLiveTide(spotId: string): { state: LiveTideState; status: LiveStatus } {
  const [state, dispatch] = useReducer(applyLiveMessage, EMPTY_LIVE_TIDE);
  const [status, setStatus] = useState<LiveStatus>('connecting');

  useEffect(() => {
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let active = AppState.currentState === 'active';

    async function connect(): Promise<void> {
      controller = new AbortController();
      const parser = createSseParser((message: SseMessage) => {
        if (message.event === 'snapshot') {
          failures = 0;
          setStatus('live');
        }
        dispatch(message);
      });
      let retryMs = DEFAULT_RETRY_MS;
      try {
        const response = await fetch(`${LIVE_URL}?spot=${encodeURIComponent(spotId)}`, {
          headers: { Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (!response.ok || response.body === null) {
          throw new Error(`Live stream: HTTP ${response.status}`);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parser.push(decoder.decode(value, { stream: true }));
        }
        retryMs = parser.retryMs() ?? DEFAULT_RETRY_MS;
      } catch {
        if (controller.signal.aborted) return;
        failures += 1;
        retryMs = Math.min(DEFAULT_RETRY_MS * 2 ** (failures - 1), MAX_BACKOFF_MS);
      }
      if (!active) return;
      setStatus('reconnecting');
      timer = setTimeout(() => void connect(), retryMs);
    }

    function stop(): void {
      if (timer !== undefined) clearTimeout(timer);
      controller?.abort();
    }

    if (active) void connect();
    const subscription = AppState.addEventListener('change', (next) => {
      const nowActive = next === 'active';
      if (nowActive === active) return;
      active = nowActive;
      if (active) {
        setStatus('reconnecting');
        void connect();
      } else {
        stop();
      }
    });

    return () => {
      active = false;
      subscription.remove();
      stop();
    };
  }, [spotId]);

  return { state, status };
}
