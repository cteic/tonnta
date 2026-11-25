import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

describe('Service worker navigation fallback', () => {
  it('does not substitute stale surf conditions for an offline swimming route', async () => {
    let response: Promise<Response> | undefined;
    const handlers: Record<string, (event: unknown) => void> = {};
    const match = vi.fn();
    runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
      self: {
        location: { origin: 'https://tonnta.surf' },
        addEventListener: (name: string, handler: (event: unknown) => void) => {
          handlers[name] = handler;
        },
      },
      URL,
      Response,
      caches: { match },
      fetch: () => Promise.reject(new Error('offline')),
    });
    handlers.fetch?.({
      request: { method: 'GET', url: 'https://tonnta.surf/swim', mode: 'navigate' },
      respondWith: (pending: Promise<Response>) => {
        response = pending;
      },
    });
    const result = await response;
    expect(result?.status).toBe(503);
    expect(await result?.text()).toContain('Live sea conditions are unavailable');
    expect(match).not.toHaveBeenCalled();
  });
});
