import { describe, expect, it } from 'vitest';

import type { SwellMapManifest } from '@tonnta/swell-map';

import {
  frameIndexNearest,
  frameLabel,
  frameUrl,
  latestManifestUrl,
  spotsOnMap,
} from './swell-map';

const MANIFEST: SwellMapManifest = {
  version: 1,
  run: '2026112706',
  source: 'NOAA GFS-Wave global.0p25',
  grid: {
    ni: 180,
    nj: 145,
    latNorth: 66,
    latSouth: 30,
    lonWest: -40,
    lonEast: 4.75,
    stepDeg: 0.25,
  },
  scale: { heightM: 0.05, periodS: 0.1, directionDeg: 360 / 254 },
  tiles: ['swell1', 'swell2', 'swell3', 'windsea'],
  frames: [
    { validTime: '2026-11-27T06:00:00Z', file: 'f000.png' },
    { validTime: '2026-11-27T09:00:00Z', file: 'f003.png' },
    { validTime: '2026-11-27T12:00:00Z', file: 'f006.png' },
  ],
};

describe('swell map URLs', () => {
  it('reads the latest manifest and run frames from the worker', () => {
    expect(latestManifestUrl('https://w.test/swell-map')).toBe(
      'https://w.test/swell-map/latest.json'
    );
    const frame = { validTime: '2026-11-27T09:00:00Z', file: 'f003.png' };
    expect(frameUrl(MANIFEST, frame, 'https://w.test/swell-map')).toBe(
      'https://w.test/swell-map/runs/2026112706/f003.png'
    );
  });
});

describe('frameLabel', () => {
  it('shows the valid time in Irish time', () => {
    // 1 July: Irish summer time is UTC+1.
    expect(frameLabel({ validTime: '2026-07-01T12:00:00Z', file: 'f000.png' })).toBe('Wed 13:00');
    expect(frameLabel({ validTime: '2026-11-27T12:00:00Z', file: 'f000.png' })).toBe('Fri 12:00');
  });
});

describe('frameIndexNearest', () => {
  it('opens on the frame closest to now', () => {
    expect(frameIndexNearest(MANIFEST, Date.parse('2026-11-27T10:20:00Z'))).toBe(1);
  });

  it('opens on the first frame when now is before the run', () => {
    expect(frameIndexNearest(MANIFEST, Date.parse('2026-11-26T00:00:00Z'))).toBe(0);
  });
});

describe('spotsOnMap', () => {
  it('marks Donabate and leaves out spots outside the grid', () => {
    const ids = spotsOnMap(MANIFEST).map((spot) => spot.id);
    expect(ids).toContain('donabate');
    expect(ids).not.toContain('el-cotillo');
  });
});
