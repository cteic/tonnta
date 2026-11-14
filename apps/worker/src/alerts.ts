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

/**
 * Alert a subscription at most once per horizon. A shorter cooldown re-announces
 * a window that was announced up to a day ahead.
 */
export const ALERT_COOLDOWN_MS = ALERT_HORIZON_MS;

/** `lastAlertedAt` is D1's `datetime('now')`: UTC without a zone suffix. */
export function isCoolingDown(lastAlertedAt: string | null, now: number): boolean {
  if (lastAlertedAt === null) return false;
  const last = Date.parse(`${lastAlertedAt}Z`);
  return Number.isFinite(last) && now - last < ALERT_COOLDOWN_MS;
}

const HOUR_MS = 60 * 60 * 1000;

/** The first hour of the window that has not ended yet, so a window already under way reports what is still to come. */
export function alertHour(window: GoodWindow, now: number): HourlyConditions | undefined {
  return window.hours.find((hour) => Date.parse(hour.time) + HOUR_MS > now);
}

/** Push services browsers use. The cron POSTs to the stored endpoint, so any other host is refused. */
const PUSH_SERVICE_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
  '.notify.windows.com',
];

export function isPushServiceEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  return PUSH_SERVICE_HOSTS.some((host) =>
    host.startsWith('.') ? url.hostname.endsWith(host) : url.hostname === host
  );
}
