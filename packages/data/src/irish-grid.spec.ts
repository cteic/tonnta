import { describe, expect, it } from 'vitest';

import { irishGridToWgs84 } from './irish-grid';

// Reference values from proj4 2.12.1 with the same OSi Helmert parameters.
const REFERENCE: [number, number, number, number][] = [
  [325151, 249004, 53.476402, -6.115786], // Donabate, Balcarrick Beach
  [38220, 25183, 51.456827, -10.328348],
  [333663, 450007, 55.278846, -5.897376],
  [200000, 250000, 53.500212, -8.000739], // false origin
];

describe('Irish Grid to WGS84', () => {
  it.each(REFERENCE)('converts %d, %d', (easting, northing, latitude, longitude) => {
    const result = irishGridToWgs84(easting, northing);
    // 1e-5 degrees is about a metre.
    expect(Math.abs(result.latitude - latitude)).toBeLessThan(1e-5);
    expect(Math.abs(result.longitude - longitude)).toBeLessThan(1e-5);
  });
});
