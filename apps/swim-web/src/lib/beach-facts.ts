import {
  bathingSeasonOn,
  fetchBathingWaterStatus,
  fetchBeachSea,
  fetchBeachWeather,
  fetchWaterQualityAlert,
} from '@tonnta/data';
import type { BathingSeasonState } from '@tonnta/data';
import type {
  BathingWater,
  BathingWaterSea,
  BathingWaterStatus,
  BathingWaterWeather,
  WaterQualityAlert,
} from '@tonnta/types';

/** A source result: loaded (value may be absent, as with "no alert") or failed. */
export type Loaded<T> = { ok: true; value: T } | { ok: false };

export interface BeachFacts {
  water: BathingWater;
  /** When this page checked the sources, ISO 8601. */
  checkedAt: string;
  season: BathingSeasonState;
  status: Loaded<BathingWaterStatus>;
  alert: Loaded<WaterQualityAlert | undefined>;
  weather: Loaded<BathingWaterWeather>;
  sea: Loaded<BathingWaterSea>;
}

const EPA_RECORD_REVALIDATE_S = 3600;
const LIVE_REVALIDATE_S = 900;

function cachedFetch(revalidateS: number): typeof fetch {
  return (input, init) => fetch(input, { ...init, next: { revalidate: revalidateS } });
}

function settle<T>(result: PromiseSettledResult<T>): Loaded<T> {
  return result.status === 'fulfilled' ? { ok: true, value: result.value } : { ok: false };
}

export async function loadBeachFacts(
  water: BathingWater,
  now: Date = new Date()
): Promise<BeachFacts> {
  const [status, alert, weather, sea] = await Promise.allSettled([
    fetchBathingWaterStatus(water.id, cachedFetch(EPA_RECORD_REVALIDATE_S)),
    fetchWaterQualityAlert(water.id, cachedFetch(LIVE_REVALIDATE_S)),
    fetchBeachWeather(water, cachedFetch(LIVE_REVALIDATE_S)),
    fetchBeachSea(water, cachedFetch(LIVE_REVALIDATE_S)),
  ]);
  return {
    water,
    checkedAt: now.toISOString(),
    season: bathingSeasonOn(now),
    status: settle(status),
    alert: settle(alert),
    weather: settle(weather),
    sea: settle(sea),
  };
}
