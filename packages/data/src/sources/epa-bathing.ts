import type { WaterQualityAlert } from '@tonnta/types';

import { isRecord } from '../guards';

/**
 * EPA bathing-water incidents (data.epa.ie) — the official source behind
 * beaches.ie. The alerts endpoint returns every active incident nationally
 * (a handful of rows); we filter for our beach. Balcarrick's id lives on
 * the spot config. Attribution: "Water quality: EPA".
 */

const ALERTS_URL = 'https://data.epa.ie/bw/api/v1/alerts';

export async function fetchWaterQualityAlert(
  beachId: string,
  fetchImpl: typeof fetch = fetch
): Promise<WaterQualityAlert | undefined> {
  const response = await fetchImpl(ALERTS_URL);
  if (!response.ok) {
    throw new Error(`EPA bathing alerts: HTTP ${response.status}`);
  }
  return findBeachAlert(await response.json(), beachId);
}

/** Pure parser, exported for tests. */
export function findBeachAlert(payload: unknown, beachId: string): WaterQualityAlert | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.list)) {
    throw new Error('EPA bathing alerts: unexpected response shape');
  }
  for (const item of payload.list) {
    if (!isRecord(item)) {
      continue;
    }
    if (item.beach_id !== beachId) {
      continue;
    }
    const beachName = typeof item.beach_name === 'string' ? item.beach_name : beachId;
    const alert: WaterQualityAlert = {
      beachId,
      beachName,
      restrictionInPlace: item.has_bathing_restriction_in_place === 'Yes',
    };
    if (typeof item.incident_start_date === 'string') {
      alert.startDate = item.incident_start_date;
    }
    return alert;
  }
  return undefined;
}
