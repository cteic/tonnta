import type { DecodedTile } from './decode';
import { inkForHeight } from './inks';

export interface CrestStroke {
  /** Endpoints in grid-cell units; multiply by the drawing scale. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Light strokes sit on the two dark inks, dark strokes on the light ones. */
  tone: 'light' | 'dark';
}

/** Below this a crest mark would claim a swell that is not worth drawing. */
export const MIN_CREST_HEIGHT_M = 0.2;

/**
 * Short wave-crest strokes in place of arrows. A crest lies across the
 * direction of travel, so for a swell coming from the west the strokes run
 * north-south. Longer period draws a longer crest.
 *
 * In grid units x grows east and y grows south. A swell from bearing θ
 * travels towards θ + 180°, and its crest runs along (cos θ, sin θ).
 */
export function crestStrokes(tile: DecodedTile, every = 6): CrestStroke[] {
  const strokes: CrestStroke[] = [];
  const start = Math.floor(every / 2);
  for (let row = start; row < tile.nj; row += every) {
    for (let column = start; column < tile.ni; column += every) {
      const index = row * tile.ni + column;
      if (tile.state[index] !== 'present') continue;
      const heightM = tile.heightM[index] ?? 0;
      if (heightM < MIN_CREST_HEIGHT_M) continue;
      const theta = ((tile.fromDeg[index] ?? 0) * Math.PI) / 180;
      const half = 0.2 + (tile.periodS[index] ?? 0) / 24;
      const cx = column + 0.5;
      const cy = row + 0.5;
      const dx = Math.cos(theta) * half;
      const dy = Math.sin(theta) * half;
      const ink = inkForHeight(heightM);
      strokes.push({
        x1: cx - dx,
        y1: cy - dy,
        x2: cx + dx,
        y2: cy + dy,
        tone: ink === 'deep' || ink === 'deepest' ? 'light' : 'dark',
      });
    }
  }
  return strokes;
}
