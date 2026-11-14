import { describe, expect, it } from 'vitest';

import { DEFAULT_SPOT_ID, SPOTS } from '@tonnta/data';

import { buildSitemapEntries } from './discoverability';
import { spotPath, swimSpotUrl } from './spot-links';

describe('Surf site links', () => {
  it('keeps existing surf links', () => {
    expect(spotPath(DEFAULT_SPOT_ID)).toBe('/');
    for (const spot of SPOTS.filter((entry) => entry.id !== DEFAULT_SPOT_ID)) {
      expect(spotPath(spot.id)).toBe(`/s/${spot.id}`);
    }
  });

  it('sends swimmers to the same spot on the swim site', () => {
    expect(swimSpotUrl(DEFAULT_SPOT_ID)).toBe('https://snamh.app/');
    expect(swimSpotUrl('el-cotillo')).toBe('https://snamh.app/s/el-cotillo');
  });

  it('publishes no swimming pages in the surf sitemap', () => {
    const urls = buildSitemapEntries('https://tonnta.surf', new Date()).map((entry) => entry.url);
    expect(urls.some((url) => url.includes('/swim'))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
