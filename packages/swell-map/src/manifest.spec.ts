import { describe, expect, it } from 'vitest';

import { isSwellMapManifest } from './manifest';
import { smallManifest } from './testing';

describe('isSwellMapManifest', () => {
  it('accepts a manifest the encoder writes', () => {
    expect(isSwellMapManifest(smallManifest())).toBe(true);
  });

  it.each([
    ['an unknown version', { version: 2 }],
    ['a run id that is not YYYYMMDDHH', { run: '2026-11-27' }],
    ['an unknown tile', { tiles: ['swell1', 'swell4'] }],
    ['no frames', { frames: [] }],
    [
      'a frame file that could leave the run folder',
      { frames: [{ validTime: '2026-11-27T12:00:00Z', file: '../latest.json' }] },
    ],
    ['a frame with no valid time', { frames: [{ validTime: 'soon', file: 'f006.png' }] }],
    ['a zero scale', { scale: { heightM: 0, periodS: 0.1, directionDeg: 1 } }],
    [
      'a grid with north below south',
      {
        grid: { ni: 3, nj: 2, latNorth: 50, latSouth: 53, lonWest: -7, lonEast: -6, stepDeg: 0.25 },
      },
    ],
  ])('rejects %s', (_label, override) => {
    expect(isSwellMapManifest({ ...smallManifest(), ...override })).toBe(false);
  });

  it('rejects things that are not objects', () => {
    expect(isSwellMapManifest(null)).toBe(false);
    expect(isSwellMapManifest('manifest')).toBe(false);
    expect(isSwellMapManifest([])).toBe(false);
  });
});
