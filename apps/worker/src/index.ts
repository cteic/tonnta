import webPush from 'web-push';

import { assessHour, fetchHourlyConditions, getSpot, isRecord } from '@tonnta/data';
import type { HourlyConditions, Spot } from '@tonnta/types';

import { parseUnsubscribeEndpoint, upcomingAlertWindow } from './alerts';
import { handleConfirm, handleFounderCount, handleRestore } from './pro';
import { handleVerdict } from './verdict';

export interface Env {
  CACHE: KVNamespace;
  DB: D1Database;
  SITE_ORIGIN: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  /** Optional until email restore goes live — dev falls back to console. */
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth_key: string;
  spot_id: string;
  min_wave_m: number;
  max_wind_kmh: number;
}

function corsHeaders(env: Env): HeadersInit {
  return {
    'Access-Control-Allow-Origin': env.SITE_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body: unknown, status: number, env: Env): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

interface SubscribePayload {
  endpoint: string;
  p256dh: string;
  auth_key: string;
  spot_id?: string;
  min_wave_m?: number;
  max_wind_kmh?: number;
}

function parseSubscribeBody(payload: unknown): SubscribePayload | undefined {
  if (!isRecord(payload)) return undefined;
  const endpoint = payload.endpoint;
  const p256dh = payload.p256dh;
  const authKey = payload.auth_key;
  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof authKey !== 'string') {
    return undefined;
  }
  const row: SubscribePayload = { endpoint, p256dh, auth_key: authKey };
  if (typeof payload.spot_id === 'string') row.spot_id = payload.spot_id;
  if (typeof payload.min_wave_m === 'number') row.min_wave_m = payload.min_wave_m;
  if (typeof payload.max_wind_kmh === 'number') row.max_wind_kmh = payload.max_wind_kmh;
  return row;
}

async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  const body = parseSubscribeBody(await request.json().catch(() => undefined));
  if (body === undefined) {
    return json({ error: 'endpoint, p256dh and auth_key are required' }, 400, env);
  }
  await env.DB.prepare(
    `INSERT INTO alert_subscriptions (endpoint, p256dh, auth_key, spot_id, min_wave_m, max_wind_kmh)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(endpoint) DO UPDATE SET
       p256dh = ?2, auth_key = ?3, spot_id = ?4, min_wave_m = ?5, max_wind_kmh = ?6`
  )
    .bind(
      body.endpoint,
      body.p256dh,
      body.auth_key,
      body.spot_id ?? 'donabate',
      body.min_wave_m ?? 0.4,
      body.max_wind_kmh ?? 25
    )
    .run();
  return json({ ok: true }, 200, env);
}

async function handleUnsubscribe(request: Request, env: Env): Promise<Response> {
  const endpoint = parseUnsubscribeEndpoint(await request.json().catch(() => undefined));
  if (endpoint === undefined) {
    return json({ error: 'endpoint is required' }, 400, env);
  }
  await env.DB.prepare('DELETE FROM alert_subscriptions WHERE endpoint = ?1').bind(endpoint).run();
  return json({ ok: true }, 200, env);
}

/** Re-alert at most once per 12 hours per subscription. */
const ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000;

async function checkAndAlert(env: Env): Promise<void> {
  const { results } = await env.DB.prepare(
    'SELECT endpoint, p256dh, auth_key, spot_id, min_wave_m, max_wind_kmh, last_alerted_at FROM alert_subscriptions'
  ).all<SubscriptionRow & { last_alerted_at: string | null }>();

  if (results.length === 0) return;

  const bySpot = new Map<string, (SubscriptionRow & { last_alerted_at: string | null })[]>();
  for (const row of results) {
    const bucket = bySpot.get(row.spot_id) ?? [];
    bucket.push(row);
    bySpot.set(row.spot_id, bucket);
  }

  webPush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const now = Date.now();

  for (const [spotId, subscribers] of bySpot) {
    const spot: Spot | undefined = getSpot(spotId);
    if (spot === undefined) continue;

    let hours: HourlyConditions[];
    try {
      hours = await fetchHourlyConditions(spot);
    } catch {
      // One spot's forecast failing must not cost every later spot its alerts.
      continue;
    }
    const window = upcomingAlertWindow(hours, spot, now);
    if (window === undefined) continue;
    const firstHour = window.hours[0];
    if (firstHour === undefined) continue;
    const verdict = assessHour(firstHour, spot);

    const title = `${spot.name}: it's on`;
    const body =
      `${firstHour.waveHeightM.toFixed(1)}m from ${new Date(window.start).toLocaleTimeString('en-IE', { hour: 'numeric', minute: '2-digit', timeZone: spot.timezone })}` +
      (verdict.board !== undefined ? ` — bring the ${verdict.board}` : '');

    for (const subscriber of subscribers) {
      if (
        subscriber.last_alerted_at !== null &&
        now - new Date(`${subscriber.last_alerted_at}Z`).getTime() < ALERT_COOLDOWN_MS
      ) {
        continue;
      }
      if (firstHour.waveHeightM < subscriber.min_wave_m) continue;
      if (firstHour.windSpeedKmh > subscriber.max_wind_kmh) continue;

      try {
        await webPush.sendNotification(
          {
            endpoint: subscriber.endpoint,
            keys: { p256dh: subscriber.p256dh, auth: subscriber.auth_key },
          },
          JSON.stringify({ title, body, url: '/' })
        );
        await env.DB.prepare(
          "UPDATE alert_subscriptions SET last_alerted_at = datetime('now') WHERE endpoint = ?1"
        )
          .bind(subscriber.endpoint)
          .run();
      } catch (error) {
        let status: number | undefined;
        if (typeof error === 'object' && error !== null && 'statusCode' in error) {
          const raw = error.statusCode;
          status = typeof raw === 'number' ? raw : undefined;
        }
        if (status === 404 || status === 410) {
          await env.DB.prepare('DELETE FROM alert_subscriptions WHERE endpoint = ?1')
            .bind(subscriber.endpoint)
            .run();
        }
      }
    }
  }
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }
    if (url.pathname === '/health') {
      return json({ ok: true }, 200, env);
    }
    if (url.pathname === '/verdict' && request.method === 'GET') {
      return handleVerdict(url, env.CACHE);
    }
    if (url.pathname === '/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env);
    }
    if (url.pathname === '/subscribe' && request.method === 'DELETE') {
      return handleUnsubscribe(request, env);
    }
    const respond = (body: unknown, status: number): Response => json(body, status, env);
    if (url.pathname === '/pro/founder-count' && request.method === 'GET') {
      return handleFounderCount(env, respond);
    }
    if (url.pathname === '/pro/restore' && request.method === 'POST') {
      return handleRestore(request, env, respond);
    }
    if (url.pathname === '/pro/confirm' && request.method === 'GET') {
      return handleConfirm(request, env, respond);
    }
    return json({ error: 'not found' }, 404, env);
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(checkAndAlert(env));
  },
};

export default worker;
