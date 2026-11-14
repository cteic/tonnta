import { isRecord, nextGoodWindow } from '@tonnta/data';
import type { GoodWindow } from '@tonnta/data';
import type { HourlyConditions, Spot } from '@tonnta/types';

/** Alerts look one day ahead. */
export const ALERT_HORIZON_MS = 24 * 60 * 60 * 1000;

/**
 * The window an alert announces: the next GO window by time, not the
 * longest, that has not ended and starts within the horizon.
 */
export function upcomingAlertWindow(
  hours: HourlyConditions[],
  spot: Spot,
  now: number
): GoodWindow | undefined {
  const window = nextGoodWindow(hours, spot, now);
  if (window === undefined || Date.parse(window.start) - now >= ALERT_HORIZON_MS) {
    return undefined;
  }
  return window;
}

/** `DELETE /subscribe` needs only the endpoint, unlike a subscribe. */
export function parseUnsubscribeEndpoint(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;
  return typeof payload.endpoint === 'string' && payload.endpoint.length > 0
    ? payload.endpoint
    : undefined;
}
