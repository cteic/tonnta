import { describe, expect, it } from 'vitest';

import { crestStrokes } from './crests';
import type { DecodedTile } from './decode';
import { inkForHeight, paintTile } from './inks';

function tileOf(
  cells: { state: DecodedTile['state'][number]; h?: number; p?: number; d?: number }[],
  ni: number
): DecodedTile {
  return {
    ni,
    nj: cells.length / ni,
    state: cells.map((cell) => cell.state),
    heightM: Float32Array.from(cells.map((cell) => cell.h ?? 0)),
    periodS: Float32Array.from(cells.map((cell) => cell.p ?? 0)),
    fromDeg: Float32Array.from(cells.map((cell) => cell.d ?? 0)),
  };
}

describe('inkForHeight', () => {
  it.each([
    [0, 'shallow'],
    [0.99, 'shallow'],
    [1, 'mid'],
    [1.99, 'mid'],
    [2, 'deep'],
    [3.99, 'deep'],
    [4, 'deepest'],
    [12.7, 'deepest'],
  ])('puts %s m in the %s band', (height, ink) => {
    expect(inkForHeight(height)).toBe(ink);
  });
});

describe('paintTile', () => {
  it('paints land in stock, calm sea in the lightest ink and swell by band', () => {
    const tile = tileOf([{ state: 'land' }, { state: 'absent' }, { state: 'present', h: 3 }], 3);
    expect(Array.from(paintTile(tile))).toEqual([
      0xf4,
      0xe9,
      0xd3,
      255, // stock
      0x7f,
      0xb5,
      0xa4,
      255, // shallow
      0x1e,
      0x4d,
      0x46,
      255, // deep
    ]);
  });
});

describe('crestStrokes', () => {
  it('draws a north-south crest for a swell from the west', () => {
    const tile = tileOf([{ state: 'present', h: 3, p: 12, d: 270 }], 1);
    const [stroke] = crestStrokes(tile, 1);
    expect(stroke).toBeDefined();
    expect(Math.abs((stroke?.x1 ?? 0) - (stroke?.x2 ?? 1))).toBeCloseTo(0, 5);
    expect(Math.abs((stroke?.y1 ?? 0) - (stroke?.y2 ?? 0))).toBeGreaterThan(0.5);
    expect(stroke?.tone).toBe('light');
  });

  it('draws a longer crest for a longer period', () => {
    const length = (period: number): number => {
      const [stroke] = crestStrokes(tileOf([{ state: 'present', h: 1.5, p: period, d: 0 }], 1), 1);
      return Math.hypot(
        (stroke?.x2 ?? 0) - (stroke?.x1 ?? 0),
        (stroke?.y2 ?? 0) - (stroke?.y1 ?? 0)
      );
    };
    expect(length(16)).toBeGreaterThan(length(6));
  });

  it('skips land, calm sea and swell too small to mark', () => {
    const tile = tileOf(
      [{ state: 'land' }, { state: 'absent' }, { state: 'present', h: 0.1, p: 8 }],
      3
    );
    expect(crestStrokes(tile, 1)).toEqual([]);
  });
});
