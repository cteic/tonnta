import type { SwellMapManifest } from './manifest';

/** A 3 x 2 grid with two tiles, small enough to reason about cell by cell. */
export function smallManifest(overrides: Partial<SwellMapManifest> = {}): SwellMapManifest {
  return {
    version: 1,
    run: '2026112706',
    source: 'NOAA GFS-Wave global.0p25',
    grid: {
      ni: 3,
      nj: 2,
      latNorth: 54,
      latSouth: 53.75,
      lonWest: -7,
      lonEast: -6.5,
      stepDeg: 0.25,
    },
    scale: { heightM: 0.05, periodS: 0.1, directionDeg: 360 / 254 },
    tiles: ['swell1', 'windsea'],
    frames: [{ validTime: '2026-11-27T12:00:00Z', file: 'f006.png' }],
    ...overrides,
  };
}

/** RGBA bytes for a frame: `pixels` lists [r, g, b, a] for every cell, tile after tile. */
export function frameBytes(pixels: [number, number, number, number][]): Uint8ClampedArray {
  return new Uint8ClampedArray(pixels.flat());
}
