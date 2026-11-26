import { afterEach, describe, expect, it, vi } from 'vitest';

import { getBathingWater } from '@tonnta/data';

import { beachFactRows } from './beach-fact-rows';
import { loadBeachFacts } from './beach-facts';

const beach = getBathingWater('donabate-balcarrick-beach');
if (beach === undefined) throw new Error('Missing Donabate fixture');
const water = beach;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Swim web EPA alerts after the facts-only switch', () => {
  it.each([true, false])(
    'keeps the alert check uncached and reports page two (valid: %s)',
    async (valid) => {
      const pageTwo = {
        count: 51,
        length: 50,
        page: 2,
        list: [
          {
            incident_id: 51,
            beach_id: water.id,
            beach_name: 'Donabate',
            has_bathing_restriction_in_place: 'Yes',
          },
        ],
      };
      const fetchImpl = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith('/alerts')) {
          if (url.searchParams.get('page') === '2') {
            return valid ? Response.json(pageTwo) : new Response(null, { status: 503 });
          }
          return Response.json({
            count: 51,
            length: 50,
            page: 1,
            list: Array.from({ length: 50 }, (_, index) => ({
              incident_id: index + 1,
              beach_id: 'another-beach',
              has_bathing_restriction_in_place: 'No',
            })),
          });
        }
        if (url.pathname.includes('/locations/')) return Response.json({ beach_id: water.id });
        return new Response(null, { status: 503 });
      });
      vi.stubGlobal('fetch', fetchImpl);

      const facts = await loadBeachFacts(water, new Date('2026-07-10T12:00:00Z'));
      const calls = fetchImpl.mock.calls.filter(([input]) => String(input).includes('/alerts?'));
      expect(calls).toHaveLength(2);
      for (const [, init] of calls) {
        expect(init?.cache).toBe('no-store');
        expect(init).not.toHaveProperty('next');
      }
      expect(beachFactRows(facts).find((row) => row.label === 'EPA alert')?.value).toBe(
        valid ? 'Bathing restriction in place' : 'Unknown'
      );
    }
  );
});
