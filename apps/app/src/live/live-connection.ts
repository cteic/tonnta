import type { SseMessage } from './sse';
import { createSseParser } from './sse';

export type LiveStatus = 'connecting' | 'live' | 'reconnecting';

export const DEFAULT_RETRY_MS = 5_000;
export const MAX_BACKOFF_MS = 30_000;

export interface LiveResponse {
  ok: boolean;
  status: number;
  body: ReadableStream<Uint8Array> | null;
}

export type LiveFetch = (
  url: string,
  init: { headers: Record<string, string>; signal: AbortSignal }
) => Promise<LiveResponse>;

/** Run `run` after `ms`; the returned function cancels it. */
export type Schedule = (run: () => void, ms: number) => () => void;

export interface LiveConnectionOptions {
  url: string;
  fetchImpl: LiveFetch;
  onMessage: (message: SseMessage) => void;
  onStatus: (status: LiveStatus) => void;
  schedule?: Schedule;
}

export interface LiveConnection {
  /** Open the stream, or reopen it after `pause`. Does nothing while open. */
  resume(): void;
  /** Close the stream and cancel any pending reconnect. */
  pause(): void;
}

function defaultSchedule(run: () => void, ms: number): () => void {
  const timer = setTimeout(run, ms);
  return () => clearTimeout(timer);
}

/**
 * One live SSE connection with reconnects. The server closes the stream every
 * 15 minutes and the connection reopens after the server's retry hint;
 * failures back off exponentially up to 30 seconds.
 */
export function createLiveConnection({
  url,
  fetchImpl,
  onMessage,
  onStatus,
  schedule = defaultSchedule,
}: LiveConnectionOptions): LiveConnection {
  let current: AbortController | undefined;
  let cancelRetry: (() => void) | undefined;
  let failures = 0;
  let active = false;
  let started = false;

  async function connect(): Promise<void> {
    // Each attempt owns its controller. An attempt that was stopped, then
    // replaced by a newer one before its rejection arrived, must check its
    // own signal, not the newer attempt's.
    const own = new AbortController();
    current = own;
    const parser = createSseParser((message: SseMessage) => {
      if (message.event === 'snapshot') {
        failures = 0;
        onStatus('live');
      }
      onMessage(message);
    });
    let retryMs = DEFAULT_RETRY_MS;
    try {
      const response = await fetchImpl(url, {
        headers: { Accept: 'text/event-stream' },
        signal: own.signal,
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
      if (own.signal.aborted) return;
      failures += 1;
      retryMs = Math.min(DEFAULT_RETRY_MS * 2 ** (failures - 1), MAX_BACKOFF_MS);
    }
    if (own.signal.aborted || current !== own || !active) return;
    onStatus('reconnecting');
    cancelRetry = schedule(() => void connect(), retryMs);
  }

  return {
    resume() {
      if (active) return;
      active = true;
      if (started) onStatus('reconnecting');
      started = true;
      void connect();
    },
    pause() {
      active = false;
      cancelRetry?.();
      cancelRetry = undefined;
      current?.abort();
    },
  };
}
