import type { SwellMapManifest, TileName } from './manifest';

/**
 * Pixel layout written by the encoder:
 *   R height, G period, B direction the swell comes from (nautical degrees)
 *   A 255 = this swell is present, 128 = sea without this swell, 0 = land
 */
export const ALPHA_PRESENT = 255;
export const ALPHA_ABSENT = 128;
export const ALPHA_LAND = 0;

export type CellState = 'present' | 'absent' | 'land';

export interface SwellCell {
  state: CellState;
  /** Metres. Zero unless `state` is `present`. */
  heightM: number;
  /** Seconds. Zero unless `state` is `present`. */
  periodS: number;
  /** Degrees the swell comes from, 0 = north. Zero unless `state` is `present`. */
  fromDeg: number;
}

/** One tile decoded into flat row-major arrays, north row first. */
export interface DecodedTile {
  ni: number;
  nj: number;
  state: CellState[];
  heightM: Float32Array;
  periodS: Float32Array;
  fromDeg: Float32Array;
}

function stateFromAlpha(alpha: number): CellState {
  if (alpha >= 192) return 'present';
  if (alpha >= 64) return 'absent';
  return 'land';
}

/**
 * Decodes one tile from a frame image's RGBA bytes (as `ImageData.data`
 * gives them). Throws if the image is not the size the manifest promises,
 * so a stale or mismatched frame fails loudly instead of drawing nonsense.
 */
export function decodeTile(
  rgba: Uint8ClampedArray,
  manifest: SwellMapManifest,
  tile: TileName
): DecodedTile {
  const { ni, nj } = manifest.grid;
  const tileIndex = manifest.tiles.indexOf(tile);
  if (tileIndex < 0) throw new Error(`frame has no ${tile} tile`);
  const expected = ni * nj * manifest.tiles.length * 4;
  if (rgba.length !== expected) {
    throw new Error(`frame is ${rgba.length} bytes, manifest expects ${expected}`);
  }

  const cells = ni * nj;
  const offset = tileIndex * cells * 4;
  const { heightM, periodS, directionDeg } = manifest.scale;
  const result: DecodedTile = {
    ni,
    nj,
    state: new Array<CellState>(cells),
    heightM: new Float32Array(cells),
    periodS: new Float32Array(cells),
    fromDeg: new Float32Array(cells),
  };
  for (let cell = 0; cell < cells; cell += 1) {
    const base = offset + cell * 4;
    const state = stateFromAlpha(rgba[base + 3] ?? 0);
    result.state[cell] = state;
    if (state !== 'present') continue;
    result.heightM[cell] = (rgba[base] ?? 0) * heightM;
    result.periodS[cell] = (rgba[base + 1] ?? 0) * periodS;
    result.fromDeg[cell] = ((rgba[base + 2] ?? 0) * directionDeg) % 360;
  }
  return result;
}

export function cellAt(tile: DecodedTile, column: number, row: number): SwellCell | undefined {
  if (column < 0 || row < 0 || column >= tile.ni || row >= tile.nj) return undefined;
  const index = row * tile.ni + column;
  return {
    state: tile.state[index] ?? 'land',
    heightM: tile.heightM[index] ?? 0,
    periodS: tile.periodS[index] ?? 0,
    fromDeg: tile.fromDeg[index] ?? 0,
  };
}

/** Grid cell (column, row) for a place; fractional, so callers can centre markers. */
export function cellForLonLat(
  manifest: SwellMapManifest,
  lon: number,
  lat: number
): { column: number; row: number } {
  const { lonWest, latNorth, stepDeg } = manifest.grid;
  return { column: (lon - lonWest) / stepDeg, row: (latNorth - lat) / stepDeg };
}
