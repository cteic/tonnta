import { isRecord } from '@tonnta/data';

import type { Env } from './index';

/**
 * Tonnta Pro entitlements — the no-accounts model.
 *
 * A purchase is keyed by checkout email. Devices are linked to a purchase by
 * a single-use magic link: POST /pro/restore emails a link; opening it on the
 * device calls GET /pro/confirm, which stamps the device's push-subscription
 * row with the entitlement email. Checkout itself (merchant of record) is
 * wired separately — these are the rails.
 */

export const FOUNDER_CAP = 100;

const TOKEN_TTL_MS = 15 * 60 * 1000;
const RESTORE_RATE_LIMIT = 5; // requests per IP per hour
const RESTORE_RATE_TTL_S = 3600;

// ─────────────────────────────────────────────────────────────────────────────
// Pure logic (unit-tested)
// ─────────────────────────────────────────────────────────────────────────────

export interface TokenRow {
  email: string;
  expires_at: string; // ISO 8601 UTC
  used_at: string | null;
}

export function isTokenValid(row: TokenRow, nowMs: number): boolean {
  if (row.used_at !== null) return false;
  const expires = Date.parse(row.expires_at);
  if (Number.isNaN(expires)) return false;
  return nowMs < expires;
}

export function founderRemaining(sold: number, cap: number = FOUNDER_CAP): number {
  if (!Number.isFinite(sold) || sold < 0) return cap;
  return Math.max(0, cap - Math.floor(sold));
}

/** Constant-time-ish comparison — always walks the full length. */
export function compareTokens(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function parseRestoreBody(payload: unknown): { email: string } | undefined {
  if (!isRecord(payload)) return undefined;
  const email = payload.email;
  if (typeof email !== 'string') return undefined;
  const trimmed = email.trim().toLowerCase();
  // Deliberately loose: enough to address an email, not to validate the world.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 254) return undefined;
  return { email: trimmed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Email delivery
// ─────────────────────────────────────────────────────────────────────────────

export interface EmailSender {
  send(to: string, subject: string, text: string): Promise<void>;
}

/** Production sender — requires RESEND_API_KEY and EMAIL_FROM secrets. */
export class ResendEmailSender implements EmailSender {
  private readonly apiKey: string;
  private readonly from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: this.from, to: [to], subject, text }),
    });
    if (!response.ok) {
      throw new Error(`Resend: HTTP ${response.status}`);
    }
  }
}

/** Dev fallback so the flow works before email keys exist. */
export class ConsoleEmailSender implements EmailSender {
  async send(to: string, subject: string, text: string): Promise<void> {
    console.warn(`[email:dev] to=${to} subject="${subject}"\n${text}`);
  }
}

export function chooseEmailSender(env: Env): EmailSender {
  if (env.RESEND_API_KEY !== undefined && env.EMAIL_FROM !== undefined) {
    return new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM);
  }
  return new ConsoleEmailSender();
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

type JsonResponder = (body: unknown, status: number) => Response;

function newToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

export async function handleFounderCount(env: Env, json: JsonResponder): Promise<Response> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS sold FROM entitlements WHERE tier = 'founder' AND status = 'active'"
  ).first<{ sold: number }>();
  const sold = row?.sold ?? 0;
  return json({ sold, cap: FOUNDER_CAP, remaining: founderRemaining(sold) }, 200);
}

export async function handleRestore(
  request: Request,
  env: Env,
  json: JsonResponder
): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const rateKey = `rl:restore:${ip}`;
  const seen = Number((await env.CACHE.get(rateKey)) ?? '0');
  if (seen >= RESTORE_RATE_LIMIT) {
    return json({ error: 'Too many restore requests — try again in an hour.' }, 429);
  }
  await env.CACHE.put(rateKey, String(seen + 1), { expirationTtl: RESTORE_RATE_TTL_S });

  const body = parseRestoreBody(await request.json().catch(() => undefined));
  if (body === undefined) {
    return json({ error: 'a valid email is required' }, 400);
  }

  // Same response whether or not a purchase exists — don't leak buyer emails.
  const entitlement = await env.DB.prepare(
    "SELECT email FROM entitlements WHERE email = ?1 AND status = 'active'"
  )
    .bind(body.email)
    .first<{ email: string }>();

  if (entitlement !== null) {
    const token = newToken();
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
    await env.DB.prepare('INSERT INTO magic_tokens (token, email, expires_at) VALUES (?1, ?2, ?3)')
      .bind(token, body.email, expiresAt)
      .run();
    const link = `${env.SITE_ORIGIN}/pro?token=${token}`;
    await chooseEmailSender(env).send(
      body.email,
      'Restore Tonnta Pro on this device',
      `Open this link on the device you want alerts on (valid 15 minutes):\n\n${link}\n\nIf you didn't request this, ignore it — nothing changes.`
    );
  }

  return json(
    { ok: true, message: 'If that email has a purchase, a restore link is on its way.' },
    200
  );
}

export async function handleConfirm(
  request: Request,
  env: Env,
  json: JsonResponder
): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') ?? '';
  const endpoint = url.searchParams.get('endpoint') ?? '';
  if (token.length === 0 || endpoint.length === 0) {
    return json({ error: 'token and endpoint are required' }, 400);
  }

  const row = await env.DB.prepare(
    'SELECT token, email, expires_at, used_at FROM magic_tokens WHERE token = ?1'
  )
    .bind(token)
    .first<TokenRow & { token: string }>();

  if (row === null || !compareTokens(row.token, token) || !isTokenValid(row, Date.now())) {
    return json({ error: 'That link has expired — request a fresh one.' }, 400);
  }

  const updated = await env.DB.prepare(
    'UPDATE alert_subscriptions SET entitlement_email = ?1 WHERE endpoint = ?2'
  )
    .bind(row.email, endpoint)
    .run();

  if (updated.meta.changes === 0) {
    return json({ error: 'Turn on alerts on this device first, then open the link again.' }, 409);
  }

  await env.DB.prepare("UPDATE magic_tokens SET used_at = datetime('now') WHERE token = ?1")
    .bind(token)
    .run();

  const tierRow = await env.DB.prepare('SELECT tier FROM entitlements WHERE email = ?1')
    .bind(row.email)
    .first<{ tier: string }>();

  return json({ ok: true, tier: tierRow?.tier ?? 'annual' }, 200);
}
