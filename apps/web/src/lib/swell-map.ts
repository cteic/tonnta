import { SPOTS, formatDayName, formatHour } from '@tonnta/data';
import type { SwellMapFrame, SwellMapManifest, TileName } from '@tonnta/swell-map';

import { PRO_API_URL } from '@/lib/pricing';

/** The worker serves the data images the scheduled encoder job writes to R2. */
export const SWELL_MAP_BASE_URL = `${PRO_API_URL}/swell-map`;

export const SWELL_MAP_TIMEZONE = 'Europe/Dublin';

export const TILE_LABELS: Record<TileName, string> = {
  swell1: 'Swell 1',
  swell2: 'Swell 2',
  swell3: 'Swell 3',
  windsea: 'Wind sea',
};

export function latestManifestUrl(base: string = SWELL_MAP_BASE_URL): string {
  return `${base}/latest.json`;
}

export function frameUrl(
  manifest: SwellMapManifest,
  frame: SwellMapFrame,
  base: string = SWELL_MAP_BASE_URL
): string {
  return `${base}/runs/${manifest.run}/${frame.file}`;
}

/** "Fri 13:00", in Irish time, for the time slider. */
export function frameLabel(frame: SwellMapFrame, timezone: string = SWELL_MAP_TIMEZONE): string {
  return `${formatDayName(frame.validTime, timezone)} ${formatHour(frame.validTime, timezone)}`;
}

/** The frame closest to `now`, so the map opens on the present, not the model run time. */
export function frameIndexNearest(manifest: SwellMapManifest, now: number): number {
  let best = 0;
  let bestGap = Number.POSITIVE_INFINITY;
  manifest.frames.forEach((frame, index) => {
    const gap = Math.abs(Date.parse(frame.validTime) - now);
    if (gap < bestGap) {
      best = index;
      bestGap = gap;
    }
  });
  return best;
}

export interface MapSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

/** Tonnta spots that fall inside the map's grid. */
export function spotsOnMap(manifest: SwellMapManifest): MapSpot[] {
  const { latNorth, latSouth, lonWest, lonEast } = manifest.grid;
  return SPOTS.filter(
    (spot) =>
      spot.latitude <= latNorth &&
      spot.latitude >= latSouth &&
      spot.longitude >= lonWest &&
      spot.longitude <= lonEast
  ).map(({ id, name, latitude, longitude }) => ({ id, name, latitude, longitude }));
}
