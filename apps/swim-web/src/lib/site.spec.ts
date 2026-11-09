import { describe, expect, it } from 'vitest';

import { isProductionHost, robotsFor, spotPath, surfSpotUrl } from './site';

describe('Swim site addresses', () => {
  it('serves Donabate at the root and other spots under /s', () => {
    expect(spotPath('donabate')).toBe('/');
    expect(spotPath('el-cotillo')).toBe('/s/el-cotillo');
  });

  it('links each spot to the same spot on the surf site', () => {
    expect(surfSpotUrl('donabate')).toBe('https://tonnta.surf/');
    expect(surfSpotUrl('el-cotillo')).toBe('https://tonnta.surf/s/el-cotillo');
  });

  it('indexes only the production host', () => {
    expect(isProductionHost('snamh.app')).toBe(true);
    expect(isProductionHost('www.snamh.app:443')).toBe(true);
    expect(isProductionHost('snamh-web.example.workers.dev')).toBe(false);
    expect(isProductionHost(null)).toBe(false);
    expect(robotsFor(false)).toEqual({ index: false, follow: false });
  });
});
