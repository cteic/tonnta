import type { DecodedTile } from './decode';

/**
 * The poster theme's screen-print inks (apps/web/src/themes/postaer). Kept
 * here as plain values because packages may not import from apps; if the
 * poster inks change, change these with them.
 */
export const SWELL_INKS = {
  stock: '#F4E9D3',
  shallow: '#7FB5A4',
  mid: '#3E8477',
  deep: '#1E4D46',
  deepest: '#143733',
  sun: '#E2593B',
} as const;

export type SeaInk = 'shallow' | 'mid' | 'deep' | 'deepest';

/** Four flat bands, not a ramp: each ink covers a range a surfer can name. */
export const HEIGHT_BANDS: readonly { ink: SeaInk; fromM: number; toM: number | null }[] = [
  { ink: 'shallow', fromM: 0, toM: 1 },
  { ink: 'mid', fromM: 1, toM: 2 },
  { ink: 'deep', fromM: 2, toM: 4 },
  { ink: 'deepest', fromM: 4, toM: null },
];

export function inkForHeight(heightM: number): SeaInk {
  for (const band of HEIGHT_BANDS) {
    if (band.toM === null || heightM < band.toM) return band.ink;
  }
  return 'deepest';
}

function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

/**
 * One RGBA pixel per cell: land in stock cream, sea without this swell in
 * the lightest ink, and each present swell in the ink for its height band.
 * The result is grid-sized; the caller scales it up with smoothing off so
 * the bands stay flat.
 */
export function paintTile(tile: DecodedTile): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tile.ni * tile.nj * 4);
  const stock = rgb(SWELL_INKS.stock);
  const inks: Record<SeaInk, [number, number, number]> = {
    shallow: rgb(SWELL_INKS.shallow),
    mid: rgb(SWELL_INKS.mid),
    deep: rgb(SWELL_INKS.deep),
    deepest: rgb(SWELL_INKS.deepest),
  };
  for (let cell = 0; cell < tile.ni * tile.nj; cell += 1) {
    const state = tile.state[cell] ?? 'land';
    let colour = stock;
    if (state === 'absent') colour = inks.shallow;
    if (state === 'present') colour = inks[inkForHeight(tile.heightM[cell] ?? 0)];
    out.set([colour[0], colour[1], colour[2], 255], cell * 4);
  }
  return out;
}
