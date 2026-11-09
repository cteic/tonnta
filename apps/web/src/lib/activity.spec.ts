import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SPOT_ID, SPOTS } from '@tonnta/data';

import swimManifest from '@/lib/swim-manifest';

import { APP_IDENTITIES, spotPath } from './activity';
import { buildSitemapEntries } from './discoverability';
import { swimMetadata } from './swim-metadata';

vi.mock('./page-metadata', () => ({
  indexingMetadata: async () => ({ robots: { index: false, follow: false } }),
}));

describe('Separate activity entry points', () => {
  it('preserves existing surf links and keeps all swim navigation in the swim app', () => {
    expect(spotPath('surf', DEFAULT_SPOT_ID)).toBe('/');
    expect(spotPath('swim', DEFAULT_SPOT_ID)).toBe('/swim');
    for (const spot of SPOTS.filter((entry) => entry.id !== DEFAULT_SPOT_ID)) {
      expect(spotPath('surf', spot.id)).toBe(`/s/${spot.id}`);
      expect(spotPath('swim', spot.id)).toBe(`/swim/s/${spot.id}`);
    }
  });

  it('publishes swimming links without duplicate default-spot pages', () => {
    const urls = buildSitemapEntries('https://tonnta.surf', new Date()).map((entry) => entry.url);
    for (const spot of SPOTS)
      expect(urls).toContain(`https://tonnta.surf${spotPath('swim', spot.id)}`);
    expect(urls).not.toContain(`https://tonnta.surf/swim/s/${DEFAULT_SPOT_ID}`);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('gives the swim installation its own identity, launch URL and scope', () => {
    expect(swimManifest()).toMatchObject({
      id: '/swim',
      start_url: '/swim',
      scope: '/swim',
      name: APP_IDENTITIES.swim.name,
    });
  });

  it('uses swimming metadata and preserves preview no-index rules', async () => {
    const metadata = await swimMetadata(DEFAULT_SPOT_ID);
    expect(metadata.title).toEqual({
      absolute: `Donabate swimming conditions · ${APP_IDENTITIES.swim.name}`,
    });
    expect(metadata.applicationName).toBe(APP_IDENTITIES.swim.name);
    expect(metadata.alternates?.canonical).toBe('/swim');
    expect(metadata.manifest).toBe('/swim/manifest.webmanifest');
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.description).toContain('water-quality');
  });
});

describe('Swimming manifest endpoint', () => {
  it('serves the install identity at the URL used by page metadata', async () => {
    const { GET } = await import('@/app/swim/manifest.webmanifest/route');
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/manifest+json');
    expect(await response.json()).toMatchObject({
      id: '/swim',
      start_url: '/swim',
      scope: '/swim',
    });
  });
});
