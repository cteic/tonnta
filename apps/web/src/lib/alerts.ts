import { isRecord } from '@tonnta/data';

/**
 * Alert subscription plumbing. The push subscription endpoint is the
 * identity — no accounts. Pure functions live here so the flow is testable
 * without a browser.
 */

export interface AlertThresholds {
  minWaveM: number;
  maxWindKmh: number;
}

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  minWaveM: 0.4,
  maxWindKmh: 25,
};

export interface SubscribePayload {
  endpoint: string;
  p256dh: string;
  auth_key: string;
  spot_id: string;
  min_wave_m: number;
  max_wind_kmh: number;
}

/** VAPID application server key must be delivered as a BufferSource. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalised);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/**
 * Convert `PushSubscription.toJSON()` output into the worker's subscribe
 * payload. Returns undefined when the browser gave us a malformed or
 * incomplete subscription (it happens — treat as untrusted input).
 */
export function buildSubscribePayload(
  subscriptionJson: unknown,
  spotId: string,
  thresholds: AlertThresholds = DEFAULT_ALERT_THRESHOLDS
): SubscribePayload | undefined {
  if (!isRecord(subscriptionJson)) return undefined;
  const { endpoint, keys } = subscriptionJson;
  if (typeof endpoint !== 'string' || endpoint.length === 0) return undefined;
  if (!isRecord(keys)) return undefined;
  const { p256dh, auth } = keys;
  if (typeof p256dh !== 'string' || typeof auth !== 'string') return undefined;
  return {
    endpoint,
    p256dh,
    auth_key: auth,
    spot_id: spotId,
    min_wave_m: thresholds.minWaveM,
    max_wind_kmh: thresholds.maxWindKmh,
  };
}

export type AlertSupport = 'supported' | 'ios-needs-install' | 'unsupported';

/**
 * Web push works everywhere modern except iOS Safari in the browser — there
 * it requires the PWA to be installed to the home screen first.
 */
export function detectAlertSupport(
  navigatorLike: { serviceWorker?: unknown; standalone?: unknown },
  windowLike: { PushManager?: unknown },
  userAgent: string
): AlertSupport {
  const hasApis = navigatorLike.serviceWorker !== undefined && windowLike.PushManager !== undefined;
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  if (hasApis) return 'supported';
  if (isIos && navigatorLike.standalone !== true) return 'ios-needs-install';
  return 'unsupported';
}
