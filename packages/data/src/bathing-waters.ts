import type { BathingWater } from '@tonnta/types';

import { BATHING_WATERS } from './bathing-waters.generated';
import { SPOTS } from './spots';

export { BATHING_WATERS };

const BY_SLUG = new Map(BATHING_WATERS.map((water) => [water.slug, water]));
const BY_ID = new Map(BATHING_WATERS.map((water) => [water.id, water]));

export function getBathingWater(slug: string): BathingWater | undefined {
  return BY_SLUG.get(slug);
}

/**
 * Old swim links used spot ids such as `donabate`. Map each spot that is an
 * EPA bathing water to that water's slug, so those links still resolve.
 */
export function bathingWaterSlugForSpot(spotId: string): string | undefined {
  const beachId = SPOTS.find((spot) => spot.id === spotId)?.epaBeachId;
  return beachId === undefined ? undefined : BY_ID.get(beachId)?.slug;
}

/** Counties in alphabetical order, each with its waters in name order. */
export function bathingWatersByCounty(): { county: string; waters: BathingWater[] }[] {
  const groups = new Map<string, BathingWater[]>();
  for (const water of BATHING_WATERS) {
    const list = groups.get(water.county) ?? [];
    list.push(water);
    groups.set(water.county, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([county, waters]) => ({
      county,
      waters: [...waters].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

/** The EPA's bathing season: 1 June to 15 September, Irish dates. */
export const BATHING_SEASON: { readonly start: string; readonly end: string } = {
  start: '06-01',
  end: '09-15',
};

export interface BathingSeasonState {
  inSeason: boolean;
  /** `YYYY-MM-DD` of the season this date falls in, or the next one. */
  start: string;
  end: string;
}

function irishDate(at: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function bathingSeasonOn(at: Date): BathingSeasonState {
  const today = irishDate(at);
  const year = Number(today.slice(0, 4));
  const monthDay = today.slice(5);
  const seasonYear = monthDay > BATHING_SEASON.end ? year + 1 : year;
  return {
    inSeason: monthDay >= BATHING_SEASON.start && monthDay <= BATHING_SEASON.end,
    start: `${seasonYear}-${BATHING_SEASON.start}`,
    end: `${seasonYear}-${BATHING_SEASON.end}`,
  };
}
