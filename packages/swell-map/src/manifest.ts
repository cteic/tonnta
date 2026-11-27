/**
 * The contract between the encoder job (`scripts/swell-map`) and every
 * client. The job writes one manifest per model run; a client reads it to
 * find the frames and to turn pixel bytes back into metres, seconds and
 * degrees.
 */

export const TILE_NAMES = ['swell1', 'swell2', 'swell3', 'windsea'] as const;
export type TileName = (typeof TILE_NAMES)[number];

export interface SwellMapGrid {
  /** Cells per row (west to east). */
  ni: number;
  /** Rows per tile (north to south in the image). */
  nj: number;
  latNorth: number;
  latSouth: number;
  /** Degrees east, -180 to 180. */
  lonWest: number;
  lonEast: number;
  /** Cell spacing in degrees, the same in both directions. */
  stepDeg: number;
}

export interface SwellMapScale {
  /** Metres per height step (red channel). */
  heightM: number;
  /** Seconds per period step (green channel). */
  periodS: number;
  /** Degrees per direction step (blue channel). */
  directionDeg: number;
}

export interface SwellMapFrame {
  /** ISO 8601 UTC time the frame is valid for. */
  validTime: string;
  /** File name inside the run folder, for example `f003.png`. */
  file: string;
}

export interface SwellMapManifest {
  version: 1;
  /** Model run, `YYYYMMDDHH`. */
  run: string;
  source: string;
  grid: SwellMapGrid;
  scale: SwellMapScale;
  /** Tile order, top to bottom, in every frame image. */
  tiles: TileName[];
  frames: SwellMapFrame[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositive(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isTileName(value: unknown): value is TileName {
  return TILE_NAMES.some((name) => name === value);
}

/** File names are fixed by the encoder; anything else could escape the run folder. */
export const FRAME_FILE = /^f\d{3}\.png$/;
export const RUN_ID = /^\d{10}$/;

function isGrid(value: unknown): value is SwellMapGrid {
  if (!isRecord(value)) return false;
  const { ni, nj, latNorth, latSouth, lonWest, lonEast, stepDeg } = value;
  return (
    Number.isInteger(ni) &&
    isPositive(ni) &&
    Number.isInteger(nj) &&
    isPositive(nj) &&
    isFiniteNumber(latNorth) &&
    isFiniteNumber(latSouth) &&
    latNorth > latSouth &&
    isFiniteNumber(lonWest) &&
    isFiniteNumber(lonEast) &&
    lonEast > lonWest &&
    isPositive(stepDeg)
  );
}

function isScale(value: unknown): value is SwellMapScale {
  if (!isRecord(value)) return false;
  return isPositive(value.heightM) && isPositive(value.periodS) && isPositive(value.directionDeg);
}

function isFrame(value: unknown): value is SwellMapFrame {
  if (!isRecord(value)) return false;
  const { validTime, file } = value;
  return (
    typeof validTime === 'string' &&
    !Number.isNaN(Date.parse(validTime)) &&
    typeof file === 'string' &&
    FRAME_FILE.test(file)
  );
}

export function isSwellMapManifest(value: unknown): value is SwellMapManifest {
  if (!isRecord(value)) return false;
  const { version, run, source, grid, scale, tiles, frames } = value;
  return (
    version === 1 &&
    typeof run === 'string' &&
    RUN_ID.test(run) &&
    typeof source === 'string' &&
    isGrid(grid) &&
    isScale(scale) &&
    Array.isArray(tiles) &&
    tiles.length > 0 &&
    tiles.every(isTileName) &&
    Array.isArray(frames) &&
    frames.length > 0 &&
    frames.every(isFrame)
  );
}
