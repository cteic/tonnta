import { describe, expect, it } from 'vitest';

import { MAX_FORECAST_AGE_MS, isForecastFresh } from './freshness';

describe('Retained forecast freshness', () => {
  it('expires one hour after checking sources', () => {
    expect(isForecastFresh(1000, 1000 + MAX_FORECAST_AGE_MS - 1)).toBe(true);
    expect(isForecastFresh(1000, 1000 + MAX_FORECAST_AGE_MS)).toBe(false);
  });
  it('fails closed for absent or future check times', () => {
    expect(isForecastFresh(NaN, 1000)).toBe(false);
    expect(isForecastFresh(1001, 1000)).toBe(false);
  });
});
