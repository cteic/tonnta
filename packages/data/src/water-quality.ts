import type {
  SwimVerdictResult,
  WaterQualityAlert,
  WaterQualityCheck,
  WaterQualityStatus,
} from '@tonnta/types';

import { applyWaterQuality } from './swim';

export const MAX_WATER_QUALITY_AGE_MS = 15 * 60 * 1000;

/** A known restriction remains authoritative even when retrieval fails or ages. */
export function getWaterQualityStatus(
  check: WaterQualityCheck | undefined,
  alert: WaterQualityAlert | undefined,
  now: number
): WaterQualityStatus {
  if (alert?.restrictionInPlace) return 'restricted';
  if (check?.status === 'unmapped') return 'unmapped';
  if (check?.status === 'unavailable') return 'unavailable';
  if (check?.status !== 'checked') return 'unchecked';
  if (!Number.isFinite(now) || !Number.isFinite(check.checkedAt) || check.checkedAt > now) {
    return 'unchecked';
  }
  return now - check.checkedAt < MAX_WATER_QUALITY_AGE_MS ? 'not-reported' : 'stale';
}

export function isWaterQualityUnknown(status: WaterQualityStatus): boolean {
  // A successful seasonal incident fetch is not a current water-quality sample.
  // Keep legacy checked payloads conservative as well.
  return status !== 'restricted';
}

export function waterQualityMessage(status: WaterQualityStatus): string {
  switch (status) {
    case 'restricted':
      return 'An EPA bathing restriction is recorded. Stay out and check current local advice.';
    case 'not-reported':
      return "No restriction was reported in EPA's in-season alerts. Current water quality is unknown; no dated water sample was checked. Check current local advice.";
    case 'checked':
      return 'Only notice retrieval was checked. Current water quality is unknown; no dated water sample was checked. Check current local advice.';
    case 'unavailable':
      return 'The bathing-notice check failed. Check local advice before each visit.';
    case 'unmapped':
      return 'No official bathing-notice feed is mapped here. Current water quality is unknown. Check local advice before each visit.';
    case 'stale':
      return 'Bathing notices need rechecking. Check local advice before each visit.';
    case 'unchecked':
      return 'Bathing notices have not been checked. Check local advice before each visit.';
  }
}

/** Never turn missing notice knowledge into positive advice or a known hazard. */
export function applySwimWaterQuality(
  result: SwimVerdictResult,
  alert: WaterQualityAlert | undefined,
  status: WaterQualityStatus
): SwimVerdictResult {
  if (alert?.restrictionInPlace) return applyWaterQuality(result, alert);
  if (status === 'restricted') {
    return {
      verdict: 'no',
      reason: waterQualityMessage(status),
      nearHighTide: result.nearHighTide,
    };
  }
  if (!isWaterQualityUnknown(status)) return result;
  // Keep a real weather hazard visible rather than replacing it with missing data.
  if (result.verdict === 'no' && result.withheld === undefined) return result;
  return {
    verdict: 'no',
    reason: waterQualityMessage(status),
    nearHighTide: result.nearHighTide,
    withheld: 'water-quality-unknown',
  };
}
