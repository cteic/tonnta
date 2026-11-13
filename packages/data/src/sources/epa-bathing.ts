import type { BathingWaterStatus, WaterQualityAlert } from '@tonnta/types';

import { asFiniteNumber, isRecord } from '../guards';

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
  // A beach can have several incidents. An active restriction must win over
  // a lifted one, whatever order the API lists them in.
  const alerts: WaterQualityAlert[] = [];
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
    alerts.push(alert);
  }
  return alerts.find((alert) => alert.restrictionInPlace) ?? alerts[0];
}

const LOCATION_URL = 'https://data.epa.ie/bw/api/v1/locations/';

export async function fetchBathingWaterStatus(
  beachId: string,
  fetchImpl: typeof fetch = fetch
): Promise<BathingWaterStatus> {
  const response = await fetchImpl(`${LOCATION_URL}${encodeURIComponent(beachId)}`);
  if (!response.ok) {
    throw new Error(`EPA bathing location: HTTP ${response.status}`);
  }
  return parseBathingWaterStatus(await response.json(), beachId);
}

/** "Yes" and "No" only. Anything else is unknown, never a default. */
function yesNo(value: unknown): boolean | undefined {
  if (value === 'Yes') return true;
  if (value === 'No') return false;
  return undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** Pure parser for one EPA location record, exported for tests. */
export function parseBathingWaterStatus(payload: unknown, beachId: string): BathingWaterStatus {
  if (!isRecord(payload) || payload.beach_id !== beachId) {
    throw new Error('EPA bathing location: unexpected response shape');
  }
  const status: BathingWaterStatus = { beachId };
  const classification = text(payload.current_annual_water_quality_classification);
  if (classification !== undefined) status.classification = classification;
  const classificationYear = asFiniteNumber(payload.current_annual_classification_year);
  if (classificationYear !== undefined) status.classificationYear = classificationYear;
  const hasLifeguard = yesNo(payload.has_lifeguard);
  if (hasLifeguard !== undefined) status.hasLifeguard = hasLifeguard;
  const lifeguardAvailability = text(payload.lifeguard_availability);
  if (lifeguardAvailability !== undefined) status.lifeguardAvailability = lifeguardAvailability;
  const isBlueFlag = yesNo(payload.is_blue_flag);
  if (isBlueFlag !== undefined) status.isBlueFlag = isBlueFlag;
  const allSeasonRestriction = yesNo(payload.has_all_season_bathing_restriction_in_place);
  if (allSeasonRestriction !== undefined) status.allSeasonRestriction = allSeasonRestriction;
  const restrictionReason = text(payload.reason_for_all_season_bathing_restriction);
  if (restrictionReason !== undefined) status.allSeasonRestrictionReason = restrictionReason;
  const pollutionRisk = yesNo(payload.short_term_pollution_risk);
  if (pollutionRisk !== undefined) status.shortTermPollutionRisk = pollutionRisk;
  const profileUrl = httpsUrl(payload.beach_profile_url);
  if (profileUrl !== undefined) status.profileUrl = profileUrl;
  const lastUpdated = text(payload.last_updated);
  if (lastUpdated !== undefined) status.lastUpdated = lastUpdated;
  return status;
}

/** Only https links reach the page. */
function httpsUrl(value: unknown): string | undefined {
  const candidate = text(value);
  if (candidate === undefined) return undefined;
  try {
    return new URL(candidate).protocol === 'https:' ? candidate : undefined;
  } catch {
    return undefined;
  }
}
