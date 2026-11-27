import { describe, expect, it } from 'vitest';

import { cellAt, cellForLonLat, decodeTile } from './decode';
import { frameBytes, smallManifest } from './testing';

const LAND: [number, number, number, number] = [0, 0, 0, 0];
const CALM: [number, number, number, number] = [0, 0, 0, 128];

// swell1 tile then windsea tile, 3 x 2 cells each, north row first.
const PIXELS: [number, number, number, number][] = [
  [40, 125, 191, 255], // 2.0 m, 12.5 s, from 270.7°
  CALM,
  LAND,
  [254, 254, 0, 255], // the top of each range
  [1, 1, 254, 255],
  CALM,
  ...Array.from({ length: 6 }, (): [number, number, number, number] => [10, 40, 127, 255]),
];

describe('decodeTile', () => {
  const manifest = smallManifest();
  const swell1 = decodeTile(frameBytes(PIXELS), manifest, 'swell1');

  it('turns channel bytes into metres, seconds and degrees', () => {
    const cell = cellAt(swell1, 0, 0);
    expect(cell?.state).toBe('present');
    expect(cell?.heightM).toBeCloseTo(2.0, 5);
    expect(cell?.periodS).toBeCloseTo(12.5, 5);
    expect(cell?.fromDeg).toBeCloseTo(270.71, 1);
  });

  it('reaches 12.7 m and 25.4 s at the top byte', () => {
    const cell = cellAt(swell1, 0, 1);
    expect(cell?.heightM).toBeCloseTo(12.7, 5);
    expect(cell?.periodS).toBeCloseTo(25.4, 5);
  });

  it('keeps direction below 360 degrees', () => {
    expect(cellAt(swell1, 1, 1)?.fromDeg).toBeLessThan(360);
  });

  it('separates sea without this swell from land', () => {
    expect(cellAt(swell1, 1, 0)?.state).toBe('absent');
    expect(cellAt(swell1, 2, 0)?.state).toBe('land');
    expect(cellAt(swell1, 1, 0)?.heightM).toBe(0);
  });

  it('reads the second tile from its own block of rows', () => {
    const windsea = decodeTile(frameBytes(PIXELS), manifest, 'windsea');
    expect(cellAt(windsea, 2, 1)?.heightM).toBeCloseTo(0.5, 5);
    expect(cellAt(windsea, 2, 1)?.periodS).toBeCloseTo(4.0, 5);
  });

  it('returns nothing outside the grid', () => {
    expect(cellAt(swell1, 3, 0)).toBeUndefined();
    expect(cellAt(swell1, 0, -1)).toBeUndefined();
  });

  it('refuses a frame whose size does not match the manifest', () => {
    expect(() => decodeTile(frameBytes(PIXELS.slice(1)), manifest, 'swell1')).toThrow(/bytes/);
  });

  it('refuses a tile the frame does not carry', () => {
    expect(() => decodeTile(frameBytes(PIXELS), manifest, 'swell3')).toThrow(/swell3/);
  });
});

describe('cellForLonLat', () => {
  it('counts columns east from the west edge and rows south from the north edge', () => {
    expect(cellForLonLat(smallManifest(), -6.5, 53.75)).toEqual({ column: 2, row: 1 });
  });
});
