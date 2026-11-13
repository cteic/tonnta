import { describe, expect, it } from 'vitest';

import { beachPath, isProductionHost, robotsFor } from './site';

describe('Swim site addresses', () => {
  it('serves each bathing water under /s', () => {
    expect(beachPath('donabate-balcarrick-beach')).toBe('/s/donabate-balcarrick-beach');
  });

  it('indexes only the production host', () => {
    expect(isProductionHost('snamh.app')).toBe(true);
    expect(isProductionHost('www.snamh.app:443')).toBe(true);
    expect(isProductionHost('snamh-web.example.workers.dev')).toBe(false);
    expect(isProductionHost(null)).toBe(false);
    expect(robotsFor(false)).toEqual({ index: false, follow: false });
  });
});
