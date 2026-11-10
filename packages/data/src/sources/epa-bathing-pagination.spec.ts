import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchWaterQualityAlert } from './epa-bathing';

const BEACH_ID = 'IEEABWC050_0000_0200';
const ALERTS_URL = 'https://data.epa.ie/bw/api/v1/alerts';

function incident(id: number, restriction: unknown = 'No', beachId = 'another-beach') {
  return {
    incident_id: id,
    beach_id: beachId,
    beach_name: beachId === BEACH_ID ? 'Balcarrick' : 'Another beach',
    has_bathing_restriction_in_place: restriction,
  };
}

function rows(startId = 1, length = 50) {
  return Array.from({ length }, (_, index) => incident(startId + index));
}

function page(count: number, pageNumber: number, list: unknown[]) {
  return { count, length: 50, page: pageNumber, list };
}

function fetchPages(...payloads: unknown[]) {
  const fetchImpl = vi.fn<typeof fetch>();
  for (const payload of payloads) {
    fetchImpl.mockResolvedValueOnce(new Response(JSON.stringify(payload)));
  }
  return fetchImpl;
}

describe('EPA national alert pagination', () => {
  it('finds a target restriction beyond the first 50 incidents', async () => {
    const fetchImpl = fetchPages(page(51, 1, rows()), page(51, 2, [incident(51, 'Yes', BEACH_ID)]));
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toMatchObject({
      beachId: BEACH_ID,
      beachName: 'Balcarrick',
      restrictionInPlace: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const [index, call] of fetchImpl.mock.calls.entries()) {
      expect(call).toEqual([
        `${ALERTS_URL}?page=${index + 1}&per_page=50`,
        { method: 'GET', cache: 'no-store', signal: expect.any(AbortSignal) },
      ]);
    }
  });

  it.each(['No', null, 'Unknown', undefined])(
    'prioritizes a later active restriction over an earlier matching flag %s',
    async (flag) => {
      const firstPage = [incident(1, flag, BEACH_ID), ...rows(2, 49)];
      const fetchImpl = fetchPages(
        page(51, 1, firstPage),
        page(51, 2, [incident(51, 'Yes', BEACH_ID)])
      );
      await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toMatchObject({
        restrictionInPlace: true,
      });
    }
  );

  it.each([null, { incident_id: 1 }, { ...incident(1), incident_id: null }])(
    'still looks for a later active restriction after a malformed earlier row %s',
    async (row) => {
      const fetchImpl = fetchPages(
        page(51, 1, [row, ...rows(2, 49)]),
        page(51, 2, [incident(51, 'Yes', BEACH_ID)])
      );
      await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toMatchObject({
        restrictionInPlace: true,
      });
    }
  );

  it('keeps a page-three restriction despite a lifted notice and unknown matching flag', async () => {
    const fetchImpl = fetchPages(
      page(101, 1, [incident(1, 'No', BEACH_ID), ...rows(2, 49)]),
      page(101, 2, [incident(51, null, BEACH_ID), ...rows(52, 49)]),
      page(101, 3, [incident(101, 'Yes', BEACH_ID)])
    );
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toMatchObject({
      restrictionInPlace: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it.each([true, false])(
    'returns a lifted notice only after all pages are checked (target first: %s)',
    async (targetFirst) => {
      const firstPage = rows();
      const secondPage = rows(51, 1);
      if (targetFirst) firstPage[0] = incident(1, 'No', BEACH_ID);
      else secondPage[0] = incident(51, 'No', BEACH_ID);
      const fetchImpl = fetchPages(page(51, 1, firstPage), page(51, 2, secondPage));
      await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toMatchObject({
        restrictionInPlace: false,
      });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    }
  );

  it('returns absence only after a complete feed, ignoring other beaches’ restriction flags', async () => {
    const fetchImpl = fetchPages(page(51, 1, rows()), page(51, 2, [incident(51, null)]));
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([50, 100])('does not request an extra page for an exact %s-row feed', async (count) => {
    const fetchImpl = fetchPages(
      ...Array.from({ length: count / 50 }, (_, index) =>
        page(count, index + 1, rows(index * 50 + 1))
      )
    );
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(count / 50);
  });

  it.each([
    'https://untrusted.example/collect?page=2',
    'alerts?page=2',
    'https://data.epa.ie/bw/api/v1/alerts?page=1&per_page=1',
    null,
  ])('constructs trusted requests instead of following next link %s', async (href) => {
    const fetchImpl = fetchPages(
      { ...page(51, 1, rows()), _links: { next: href === null ? null : { href } } },
      page(51, 2, rows(51, 1))
    );
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toBeUndefined();
    expect(fetchImpl.mock.calls.map(([input]) => input)).toEqual([
      `${ALERTS_URL}?page=1&per_page=50`,
      `${ALERTS_URL}?page=2&per_page=50`,
    ]);
  });
});

describe('EPA feed completeness failures', () => {
  it.each([
    {},
    { count: 0 },
    { count: 0, length: 50 },
    { count: '0', length: 50, page: 1 },
    { count: null, length: 50, page: 1 },
    { count: false, length: 50, page: 1 },
    { count: -1, length: 50, page: 1 },
    { count: 0.5, length: 50, page: 1 },
    { count: Number.MAX_SAFE_INTEGER + 1, length: 50, page: 1 },
    { count: 0, length: '50', page: 1 },
    { count: 0, length: 0, page: 1 },
    { count: 0, length: 49, page: 1 },
    { count: 0, length: 50, page: '1' },
    { count: 0, length: 50, page: 0 },
    { count: 0, length: 50, page: 2 },
  ])('rejects missing or invalid numeric pagination metadata %j', async (metadata) => {
    await expect(
      fetchWaterQualityAlert(BEACH_ID, fetchPages({ ...metadata, list: [] }))
    ).rejects.toThrow('invalid pagination metadata');
  });

  it.each([undefined, null, '', '1', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'requires a positive safe-integer incident ID before returning a lifted notice: %s',
    async (incidentId) => {
      const fetchImpl = fetchPages(
        page(1, 1, [{ ...incident(1, 'No', BEACH_ID), incident_id: incidentId }])
      );
      await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
        'invalid incident ID'
      );
    }
  );

  it('rejects a missing unrelated incident ID before returning absence', async () => {
    const fetchImpl = fetchPages(page(1, 1, [{ ...incident(1), incident_id: undefined }]));
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
      'invalid incident ID'
    );
  });

  it('rejects duplicate incident IDs within a page even when row details differ', async () => {
    const fetchImpl = fetchPages(page(2, 1, [incident(1, 'No', BEACH_ID), incident(1)]));
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
      'duplicate incident ID'
    );
  });

  it('rejects duplicate incident IDs across pages', async () => {
    const fetchImpl = fetchPages(page(51, 1, rows()), page(51, 2, [incident(1, 'No', BEACH_ID)]));
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
      'duplicate incident ID'
    );
  });

  it('rejects repeated rows even if the server increments the page number', async () => {
    const fetchImpl = fetchPages(page(100, 1, rows()), page(100, 2, rows()));
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
      'duplicate incident ID'
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('rejects a repeated page number instead of mistaking it for the final page', async () => {
    const fetchImpl = fetchPages(page(51, 1, rows()), page(51, 1, rows(51, 1)));
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow('invalid pagination');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([50, 52, 0])('rejects a total that changes from 51 to %s', async (count) => {
    const fetchImpl = fetchPages(page(51, 1, rows()), page(count, 2, rows(51, 1)));
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow('total changed');
  });

  it.each([
    [51, 1, 49],
    [51, 1, 0],
    [51, 1, 51],
    [0, 1, 1],
  ])(
    'rejects an incomplete or excessive first page (%s total, page %s, %s rows)',
    async (count, n, length) => {
      await expect(
        fetchWaterQualityAlert(BEACH_ID, fetchPages(page(count, n, rows(1, length))))
      ).rejects.toThrow('incomplete page');
    }
  );

  it.each([0, 2, 50])(
    'rejects a final page containing %s rows when one is required',
    async (length) => {
      const fetchImpl = fetchPages(page(51, 1, rows()), page(51, 2, rows(51, length)));
      await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow('incomplete page');
    }
  );

  it('rejects an empty intermediate page instead of silently ending traversal', async () => {
    const fetchImpl = fetchPages(page(101, 1, rows()), page(101, 2, []));
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow('incomplete page');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not hide a malformed matching flag behind a lifted notice on another page', async () => {
    const fetchImpl = fetchPages(
      page(51, 1, [incident(1, null, BEACH_ID), ...rows(2, 49)]),
      page(51, 2, [incident(51, 'No', BEACH_ID)])
    );
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
      'unrecognized restriction'
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([{ href: 'alerts?page=2' }, 'https://untrusted.example/collect', { href: '' }, {}])(
    'rejects a contradictory next-page hint on a declared empty feed: %j',
    async (next) => {
      const fetchImpl = fetchPages({ ...page(0, 1, []), _links: { next } });
      await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
        'unexpected next page'
      );
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  );

  it('rejects a next-page hint on the final page after a partial lifted notice', async () => {
    const fetchImpl = fetchPages(page(51, 1, [incident(1, 'No', BEACH_ID), ...rows(2, 49)]), {
      ...page(51, 2, rows(51, 1)),
      _links: { next: { href: 'alerts?page=3' } },
    });
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
      'unexpected next page'
    );
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([undefined, null, '', ' '])(
    'accepts an absent/empty final next relation: %j',
    async (next) => {
      const fetchImpl = fetchPages({ ...page(0, 1, []), _links: { next } });
      await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toBeUndefined();
    }
  );

  it('bounds pagination before attempting to traverse an excessive feed', async () => {
    const fetchImpl = fetchPages(page(1001, 1, rows()));
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow('pagination limit');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('can complete exactly the 20-page bound without fetching page 21', async () => {
    const fetchImpl = fetchPages(
      ...Array.from({ length: 20 }, (_, index) => page(1000, index + 1, rows(index * 50 + 1)))
    );
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(20);
  });

  describe.each(['absent', 'lifted'])('after a partial %s result', (state) => {
    function firstPage() {
      return page(51, 1, [
        incident(1, 'No', state === 'lifted' ? BEACH_ID : 'another-beach'),
        ...rows(2, 49),
      ]);
    }

    it.each([429, 500, 503])('rejects a later HTTP %s error', async (status) => {
      const fetchImpl = fetchPages(firstPage());
      fetchImpl.mockResolvedValueOnce(new Response('{}', { status }));
      await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(`HTTP ${status}`);
    });

    it('rejects a later network failure', async () => {
      const error = new Error('Connection lost');
      const fetchImpl = fetchPages(firstPage());
      fetchImpl.mockRejectedValueOnce(error);
      await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toBe(error);
    });

    it('rejects invalid JSON on a later page', async () => {
      const fetchImpl = fetchPages(firstPage());
      fetchImpl.mockResolvedValueOnce(new Response('<html>upstream unavailable</html>'));
      await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toBeInstanceOf(SyntaxError);
    });

    it.each([{}, { list: null }, { list: 'unavailable' }, { list: [] }])(
      'rejects a later response with invalid schema %j',
      async (payload) => {
        await expect(
          fetchWaterQualityAlert(BEACH_ID, fetchPages(firstPage(), payload))
        ).rejects.toThrow();
      }
    );
  });
});

describe('EPA known restriction preservation', () => {
  it('can stop at a known active restriction without risking a later retrieval failure', async () => {
    const fetchImpl = fetchPages(page(51, 1, [incident(1, 'Yes', BEACH_ID), ...rows(2, 49)]));
    fetchImpl.mockRejectedValueOnce(new Error('Later page unavailable'));
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toMatchObject({
      restrictionInPlace: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    {},
    { count: 1001, length: 50, page: 1 },
    { count: 0, length: 50, page: 1 },
    { count: 1, length: 1, page: 2 },
  ])('preserves a known active row despite invalid pagination metadata %j', async (metadata) => {
    const fetchImpl = fetchPages({ ...metadata, list: [incident(1, 'Yes', BEACH_ID)] });
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toMatchObject({
      restrictionInPlace: true,
    });
  });

  it('preserves an active restriction even when a next-page hint contradicts the total', async () => {
    const fetchImpl = fetchPages({
      ...page(1, 1, [incident(1, 'Yes', BEACH_ID)]),
      _links: { next: { href: 'alerts?page=2' } },
    });
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toMatchObject({
      restrictionInPlace: true,
    });
  });

  it('preserves a known active restriction with an invalid incident ID', async () => {
    const fetchImpl = fetchPages(
      page(1, 1, [{ ...incident(1, 'Yes', BEACH_ID), incident_id: null }])
    );
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toMatchObject({
      restrictionInPlace: true,
    });
  });

  it('preserves a later active restriction despite duplicate IDs on an earlier page', async () => {
    const fetchImpl = fetchPages(
      page(51, 1, [incident(1), incident(1), ...rows(3, 48)]),
      page(51, 2, [incident(51, 'Yes', BEACH_ID)])
    );
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toMatchObject({
      restrictionInPlace: true,
    });
  });

  it('preserves a restriction on a later page even when totals change or the page is short', async () => {
    const fetchImpl = fetchPages(
      page(100, 1, rows()),
      page(101, 2, [incident(51, 'Yes', BEACH_ID)])
    );
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).resolves.toMatchObject({
      restrictionInPlace: true,
    });
  });
});

describe('EPA operational retrieval deadline', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  });

  afterEach(() => {
    const remainingTimers = vi.getTimerCount();
    vi.useRealTimers();
    vi.restoreAllMocks();
    expect(remainingTimers).toBe(0);
  });

  function firstPage(count = 51) {
    return page(count, 1, [incident(1, 'No', BEACH_ID), ...rows(2, 49)]);
  }

  it.each([true, false])(
    'never returns a first-page No after the second fetch stalls (supports abort: %s)',
    async (supportsAbort) => {
      const fetchImpl = fetchPages(firstPage());
      fetchImpl.mockImplementationOnce(
        (_input, init) =>
          new Promise((_, reject) => {
            if (supportsAbort) {
              init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')), {
                once: true,
              });
            }
          })
      );
      const result = fetchWaterQualityAlert(BEACH_ID, fetchImpl);
      const failure = expect(result).rejects.toThrow('retrieval timed out');
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
      const signal = fetchImpl.mock.calls[1]?.[1]?.signal;
      expect(signal).toBe(fetchImpl.mock.calls[0]?.[1]?.signal);
      expect(signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(29_999);
      expect(signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await failure;
      expect(signal?.aborted).toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    }
  );

  it('bounds stalled JSON body consumption after a first-page No', async () => {
    const fetchImpl = fetchPages(firstPage());
    const response = new Response('{}');
    const json = vi.spyOn(response, 'json').mockReturnValue(new Promise(() => {}));
    fetchImpl.mockResolvedValueOnce(response);
    const failure = expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
      'retrieval timed out'
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(json).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(30_000);
    await failure;
    expect(fetchImpl.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('shares one budget across all pages instead of restarting the timer per request', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    fetchImpl.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(new Response(JSON.stringify(firstPage()))), 20_000);
        })
    );
    fetchImpl.mockReturnValueOnce(new Promise(() => {}));
    const failure = expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
      'retrieval timed out'
    );
    await vi.advanceTimersByTimeAsync(20_000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10_000);
    await failure;
    expect(fetchImpl.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
  });

  it.each(['fetch', 'body'])(
    'ignores a late %s result and never starts another page after timeout',
    async (stage) => {
      const fetchImpl = fetchPages(firstPage(101));
      let finishFetch: ((value: Response) => void) | undefined;
      let finishBody: ((value: unknown) => void) | undefined;
      const lateResponse = new Response('{}');
      if (stage === 'fetch') {
        fetchImpl.mockReturnValueOnce(
          new Promise((resolve) => {
            finishFetch = resolve;
          })
        );
      } else {
        vi.spyOn(lateResponse, 'json').mockReturnValueOnce(
          new Promise((resolve) => {
            finishBody = resolve;
          })
        );
        fetchImpl.mockResolvedValueOnce(lateResponse);
      }
      const failure = expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
        'retrieval timed out'
      );
      await vi.advanceTimersByTimeAsync(30_000);
      await failure;
      finishFetch?.(new Response(JSON.stringify(page(101, 2, rows(51)))));
      finishBody?.(page(101, 2, rows(51)));
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    }
  );

  it('rejects a late response even if a delayed event loop has not run the timeout callback', async () => {
    let elapsed = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => {
      elapsed = 30_001;
      return new Response(JSON.stringify(page(1, 1, [incident(1, 'No', BEACH_ID)])));
    });
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(
      'retrieval timed out'
    );
    expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it.each(['absent', 'lifted', 'active'])(
    'cleans up the timeout after a successful %s result',
    async (state) => {
      const list =
        state === 'absent' ? [] : [incident(1, state === 'active' ? 'Yes' : 'No', BEACH_ID)];
      const fetchImpl = fetchPages(page(list.length, 1, list));
      const result = await fetchWaterQualityAlert(BEACH_ID, fetchImpl);
      if (state === 'absent') expect(result).toBeUndefined();
      else expect(result?.restrictionInPlace).toBe(state === 'active');
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    }
  );

  it.each(['HTTP', 'JSON', 'schema', 'network'])(
    'cleans up and aborts after a non-timeout %s failure',
    async (stage) => {
      const fetchImpl = vi.fn<typeof fetch>();
      if (stage === 'HTTP') fetchImpl.mockResolvedValueOnce(new Response('{}', { status: 503 }));
      else if (stage === 'JSON') fetchImpl.mockResolvedValueOnce(new Response('invalid JSON'));
      else if (stage === 'schema') fetchImpl.mockResolvedValueOnce(new Response('{}'));
      else fetchImpl.mockRejectedValueOnce(new Error('Connection lost'));
      await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow();
      expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      await vi.advanceTimersByTimeAsync(60_000);
    }
  );

  it('keeps an active restriction observed just before the deadline without waiting for later pages', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve(
                new Response(
                  JSON.stringify(page(51, 1, [incident(1, 'Yes', BEACH_ID), ...rows(2, 49)]))
                )
              ),
            29_999
          );
        })
    );
    const result = fetchWaterQualityAlert(BEACH_ID, fetchImpl);
    await vi.advanceTimersByTimeAsync(29_999);
    await expect(result).resolves.toMatchObject({ restrictionInPlace: true });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
  });
});
