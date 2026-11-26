import { describe, expect, it, vi } from 'vitest';

import { fetchWaterQualityAlert, findBeachAlert } from './epa-bathing';

const BEACH_ID = 'IEEABWC050_0000_0200';

function incident(restriction: unknown, beachId = BEACH_ID) {
  return {
    incident_id: 1,
    beach_id: beachId,
    beach_name: 'Test beach',
    has_bathing_restriction_in_place: restriction,
    incident_start_date: '2026-11-09',
  };
}

function responseWith(payload: unknown): typeof fetch {
  return async () => new Response(JSON.stringify(payload), { status: 200 });
}

describe('EPA bathing restriction safety boundary', () => {
  it.each([
    ['Yes', 'No'],
    ['No', 'Yes'],
  ])('keeps an active restriction for incident order %s, %s', (first, second) => {
    expect(findBeachAlert({ list: [incident(first), incident(second)] }, BEACH_ID)).toMatchObject({
      beachId: BEACH_ID,
      restrictionInPlace: true,
    });
  });

  it('recognizes an explicit lifted restriction', () => {
    expect(findBeachAlert({ list: [incident('No')] }, BEACH_ID)).toMatchObject({
      restrictionInPlace: false,
    });
  });

  it.each([undefined, null, true, false, 1, 0, '', 'yes', 'no', 'Unknown', ' Yes '])(
    'rejects an unrecognized matching restriction flag %s instead of claiming it is lifted',
    (flag) => {
      expect(() => findBeachAlert({ list: [incident(flag)] }, BEACH_ID)).toThrow();
    }
  );

  it('rejects an absent matching restriction flag', () => {
    expect(() => findBeachAlert({ list: [{ beach_id: BEACH_ID }] }, BEACH_ID)).toThrow();
  });

  it.each([true, false])(
    'does not hide an uncertain incident behind a lifted incident (unknown first: %s)',
    (unknownFirst) => {
      const rows = [incident(undefined), incident('No')];
      if (!unknownFirst) rows.reverse();
      expect(() => findBeachAlert({ list: rows }, BEACH_ID)).toThrow();
    }
  );

  it.each([true, false])(
    'preserves a known active restriction alongside an uncertain incident (unknown first: %s)',
    (unknownFirst) => {
      const rows = [incident(undefined), incident('Yes')];
      if (!unknownFirst) rows.reverse();
      expect(findBeachAlert({ list: rows }, BEACH_ID)?.restrictionInPlace).toBe(true);
    }
  );

  it.each([null, undefined, [], {}, { list: null }, { list: {} }, { list: 'unavailable' }])(
    'rejects an invalid top-level response shape %s',
    (payload) => {
      expect(() => findBeachAlert(payload, BEACH_ID)).toThrow('unexpected response shape');
    }
  );

  it.each([
    null,
    {},
    [],
    'incident',
    { beach_id: null },
    { beach_id: '' },
    { beach_id: ' ' },
    { beachId: BEACH_ID },
  ])('rejects an unidentifiable incident %s instead of treating it as an absent notice', (row) => {
    expect(() => findBeachAlert({ list: [row] }, BEACH_ID)).toThrow('unidentifiable incident');
  });
  it.each([true, false])(
    'keeps a known active local restriction despite an unidentifiable row (first: %s)',
    (first) => {
      const rows = [null, incident('Yes')];
      if (!first) rows.reverse();
      expect(findBeachAlert({ list: rows }, BEACH_ID)?.restrictionInPlace).toBe(true);
    }
  );
  it('returns no incident for an empty valid list, without inventing a lifted restriction', () => {
    expect(findBeachAlert({ list: [] }, BEACH_ID)).toBeUndefined();
  });

  it('returns no incident for an unmatched beach, without interpreting other beach flags', () => {
    const payload = { list: [incident('Yes', 'another-beach'), incident(null, 'other-beach')] };
    expect(findBeachAlert(payload, BEACH_ID)).toBeUndefined();
  });

  it('does not confuse an active incident at another beach with a lifted local incident', () => {
    const payload = { list: [incident('Yes', 'another-beach'), incident('No')] };
    expect(findBeachAlert(payload, BEACH_ID)?.restrictionInPlace).toBe(false);
  });

  it('falls back to the matched beach ID when its name is missing', () => {
    const payload = { list: [{ ...incident('Yes'), beach_name: null }] };
    expect(findBeachAlert(payload, BEACH_ID)?.beachName).toBe(BEACH_ID);
  });
});

describe('EPA bathing source failures', () => {
  it('requests an uncached notice retrieval on every client', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ count: 0, length: 50, page: 1, list: [] })));
    await fetchWaterQualityAlert(BEACH_ID, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://data.epa.ie/bw/api/v1/alerts?page=1&per_page=50',
      { method: 'GET', cache: 'no-store', signal: expect.any(AbortSignal) }
    );
  });
  it.each([429, 500, 503])('propagates HTTP %s as a failure, not no incident', async (status) => {
    const fetchImpl: typeof fetch = async () => new Response('{}', { status });
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toThrow(`HTTP ${status}`);
  });

  it('propagates a network rejection', async () => {
    const error = new Error('Network unavailable');
    const fetchImpl: typeof fetch = async () => {
      throw error;
    };
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toBe(error);
  });

  it('propagates invalid JSON', async () => {
    const fetchImpl: typeof fetch = async () => new Response('<html>upstream error</html>');
    await expect(fetchWaterQualityAlert(BEACH_ID, fetchImpl)).rejects.toBeInstanceOf(SyntaxError);
  });

  it('propagates a wrong-shape successful HTTP response', async () => {
    await expect(
      fetchWaterQualityAlert(BEACH_ID, responseWith({ error: 'unavailable' }))
    ).rejects.toThrow('unexpected response shape');
  });

  it('propagates an unknown matching restriction flag as source failure', async () => {
    await expect(
      fetchWaterQualityAlert(
        BEACH_ID,
        responseWith({ count: 1, length: 50, page: 1, list: [incident(null)] })
      )
    ).rejects.toThrow();
  });

  it('keeps a valid empty source response distinct from source failure', async () => {
    await expect(
      fetchWaterQualityAlert(BEACH_ID, responseWith({ count: 0, length: 50, page: 1, list: [] }))
    ).resolves.toBeUndefined();
  });
});
