import type { WaterQualityAlert } from '@tonnta/types';

import { isRecord } from '../guards';

/**
 * EPA bathing-water incidents (data.epa.ie), the official source behind
 * beaches.ie. The national alerts feed is paginated; Balcarrick's beach ID
 * lives on the spot config. Attribution: "Water quality: EPA".
 */
const ALERTS_URL = 'https://data.epa.ie/bw/api/v1/alerts';
const ALERTS_PAGE_SIZE = 50;
const MAX_ALERT_PAGES = 20;
// Operational retrieval budget, not a claim about how long water is safe.
const ALERTS_TIMEOUT_MS = 30_000;

export async function fetchWaterQualityAlert(
  beachId: string,
  fetchImpl: typeof fetch = fetch
): Promise<WaterQualityAlert | undefined> {
  const controller = new AbortController();
  const deadline = performance.now() + ALERTS_TIMEOUT_MS;
  const timeoutError = new Error('EPA bathing alerts: retrieval timed out');
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(timeoutError);
      controller.abort();
    }, ALERTS_TIMEOUT_MS);
  });
  function checkDeadline() {
    // A delayed event loop must not let a late response beat the timeout timer.
    if (performance.now() >= deadline) throw timeoutError;
  }
  async function withinDeadline<T>(pending: Promise<T>): Promise<T> {
    // Abort is best effort; this race also bounds clients/bodies that ignore it.
    const result = await Promise.race([pending, timedOut]);
    checkDeadline();
    return result;
  }

  // React Native's RequestInit omits cache; keep the standard fetch hint for clients that honor it.
  const request = { method: 'GET', cache: 'no-store' as const, signal: controller.signal };
  const incidentIds = new Set<number>();
  let total: number | undefined;
  let liftedAlert: WaterQualityAlert | undefined;
  let incompleteSource: Error | undefined;

  try {
    for (let page = 1; page <= MAX_ALERT_PAGES; page += 1) {
      // EPA next links can omit selectors. Never follow response URLs, including
      // links to another host; retain the trusted endpoint and explicit page size.
      checkDeadline();
      const response = await withinDeadline(
        fetchImpl(`${ALERTS_URL}?page=${page}&per_page=${ALERTS_PAGE_SIZE}`, request)
      );
      if (!response.ok) {
        throw new Error(`EPA bathing alerts: HTTP ${response.status}`);
      }
      const payload: unknown = await withinDeadline(response.json());
      const rows = alertRows(payload);
      const result = scanBeachAlerts(rows, beachId);
      // An observed restriction is useful even when the feed is incomplete.
      // Absence/lifted notices, by contrast, require the entire validated feed.
      if (result.alert?.restrictionInPlace) return result.alert;
      liftedAlert ??= result.alert;
      incompleteSource ??= result.error;

      total = validatePagination(payload, rows.length, page, total);
      // Only unique positive numeric IDs establish row coverage. Missing IDs or
      // duplicates can hide omitted incidents, so they cannot support absence.
      // Keep scanning otherwise valid pages in case a known restriction follows.
      for (const row of rows) {
        if (
          !isRecord(row) ||
          typeof row.incident_id !== 'number' ||
          !Number.isSafeInteger(row.incident_id) ||
          row.incident_id <= 0
        ) {
          incompleteSource ??= new Error('EPA bathing alerts: invalid incident ID');
        } else if (incidentIds.has(row.incident_id)) {
          incompleteSource ??= new Error('EPA bathing alerts: duplicate incident ID');
        } else {
          incidentIds.add(row.incident_id);
        }
      }

      if (page * ALERTS_PAGE_SIZE >= total) {
        if (incompleteSource !== undefined) throw incompleteSource;
        checkDeadline();
        return liftedAlert;
      }
    }
    throw new Error('EPA bathing alerts: pagination limit exceeded');
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

/**
 * Require the documented numeric count (total), length (requested page size)
 * and page, even for an empty feed. Missing metadata, changing totals, missing
 * rows or excessive totals cannot establish a complete national alert check.
 * Numeric metadata controls traversal. A next-link hint on the declared final
 * page contradicts completeness, but its URL is never followed.
 */
function validatePagination(
  payload: unknown,
  rowCount: number,
  page: number,
  previousTotal: number | undefined
): number {
  if (
    !isRecord(payload) ||
    typeof payload.count !== 'number' ||
    !Number.isSafeInteger(payload.count) ||
    payload.count < 0 ||
    payload.length !== ALERTS_PAGE_SIZE ||
    payload.page !== page
  ) {
    throw new Error('EPA bathing alerts: invalid pagination metadata');
  }
  if (payload.count > MAX_ALERT_PAGES * ALERTS_PAGE_SIZE) {
    throw new Error('EPA bathing alerts: pagination limit exceeded');
  }
  if (previousTotal !== undefined && payload.count !== previousTotal) {
    throw new Error('EPA bathing alerts: total changed during pagination');
  }
  const expectedRows = Math.min(ALERTS_PAGE_SIZE, payload.count - (page - 1) * ALERTS_PAGE_SIZE);
  if (rowCount !== expectedRows) {
    throw new Error('EPA bathing alerts: incomplete page');
  }
  const next = isRecord(payload._links) ? payload._links.next : undefined;
  if (
    page * ALERTS_PAGE_SIZE >= payload.count &&
    next !== undefined &&
    next !== null &&
    !(typeof next === 'string' && next.trim() === '')
  ) {
    throw new Error('EPA bathing alerts: unexpected next page');
  }
  return payload.count;
}

function alertRows(payload: unknown): unknown[] {
  if (!isRecord(payload) || !Array.isArray(payload.list)) {
    throw new Error('EPA bathing alerts: unexpected response shape');
  }
  return payload.list;
}

/**
 * Pure incident parser, exported for tests. Only fetchWaterQualityAlert verifies
 * pagination; a single parsed page cannot establish absence or a lifted notice.
 */
export function findBeachAlert(payload: unknown, beachId: string): WaterQualityAlert | undefined {
  const result = scanBeachAlerts(alertRows(payload), beachId);
  if (result.error !== undefined) throw result.error;
  return result.alert;
}

function scanBeachAlerts(
  rows: unknown[],
  beachId: string
): { alert: WaterQualityAlert | undefined; error: Error | undefined } {
  // Uncertain rows must not hide an active restriction later in this page or
  // another page. Defer row errors until the complete feed has been examined.
  let liftedAlert: WaterQualityAlert | undefined;
  let hasUnknownRestriction = false;
  let hasUnidentifiableIncident = false;
  for (const item of rows) {
    if (!isRecord(item) || typeof item.beach_id !== 'string' || item.beach_id.trim() === '') {
      hasUnidentifiableIncident = true;
      continue;
    }
    if (item.beach_id !== beachId) {
      continue;
    }
    const restriction = item.has_bathing_restriction_in_place;
    if (restriction !== 'Yes' && restriction !== 'No') {
      hasUnknownRestriction = true;
      continue;
    }
    const beachName = typeof item.beach_name === 'string' ? item.beach_name : beachId;
    const alert: WaterQualityAlert = {
      beachId,
      beachName,
      restrictionInPlace: restriction === 'Yes',
    };
    if (typeof item.incident_start_date === 'string') {
      alert.startDate = item.incident_start_date;
    }
    if (alert.restrictionInPlace) return { alert, error: undefined };
    liftedAlert ??= alert;
  }
  if (hasUnidentifiableIncident) {
    return { alert: liftedAlert, error: new Error('EPA bathing alerts: unidentifiable incident') };
  }
  // An unrecognized flag is not evidence that a restriction has been lifted.
  if (hasUnknownRestriction) {
    return {
      alert: liftedAlert,
      error: new Error('EPA bathing alerts: unrecognized restriction flag'),
    };
  }
  return { alert: liftedAlert, error: undefined };
}
