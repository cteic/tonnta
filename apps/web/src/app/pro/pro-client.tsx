'use client';

import { useEffect, useState } from 'react';

import { isRecord } from '@tonnta/data';

import {
  CHECKOUT_URL_ANNUAL,
  CHECKOUT_URL_FOUNDER,
  FOUNDER_CAP,
  PRICE_ANNUAL_EUR,
  PRICE_FOUNDER_EUR,
  PRO_API_URL,
  formatEuro,
} from '@/lib/pricing';

const CARD: React.CSSProperties = {
  background: '#122630',
  border: '1px solid #22404C',
  borderRadius: 16,
  padding: 24,
};

const EYEBROW: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: '#6E8A90',
};

const DISPLAY: React.CSSProperties = {
  fontFamily: "'Clash Display', sans-serif",
  fontWeight: 700,
  color: '#E8ECEB',
};

type RestoreState = 'idle' | 'sending' | 'sent' | 'error';
type ConfirmState = 'none' | 'confirming' | 'confirmed' | 'needs-alerts' | 'expired';

function parseFounderCount(payload: unknown): number | undefined {
  if (!isRecord(payload)) return undefined;
  return typeof payload.remaining === 'number' ? payload.remaining : undefined;
}

function CheckoutButton({ href, label }: { href: string; label: string }) {
  if (href.length === 0) {
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '10px 20px',
          borderRadius: 999,
          border: '1px solid #31525F',
          color: '#6E8A90',
          fontSize: 14,
        }}
      >
        Checkout opens shortly
      </span>
    );
  }
  return (
    <a
      href={href}
      style={{
        display: 'inline-block',
        padding: '10px 22px',
        borderRadius: 999,
        background: '#E8A33D',
        color: '#0C1B22',
        fontFamily: "'Clash Display', sans-serif",
        fontWeight: 600,
        fontSize: 15,
      }}
    >
      {label}
    </a>
  );
}

export function ProClient() {
  const [remaining, setRemaining] = useState<number | undefined>(undefined);
  const [restore, setRestore] = useState<RestoreState>('idle');
  const [email, setEmail] = useState('');
  const [confirm, setConfirm] = useState<ConfirmState>('none');

  useEffect(() => {
    fetch(`${PRO_API_URL}/pro/founder-count`)
      .then((response) => response.json())
      .then((payload: unknown) => setRemaining(parseFounderCount(payload)))
      .catch(() => setRemaining(undefined));
  }, []);

  // Magic-link landing: /pro?token=... — link this device's push subscription.
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token === null) return;
    setConfirm('confirming');
    (async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription === null) {
          setConfirm('needs-alerts');
          return;
        }
        const response = await fetch(
          `${PRO_API_URL}/pro/confirm?token=${encodeURIComponent(token)}&endpoint=${encodeURIComponent(subscription.endpoint)}`
        );
        if (response.ok) {
          setConfirm('confirmed');
        } else if (response.status === 409) {
          setConfirm('needs-alerts');
        } else {
          setConfirm('expired');
        }
      } catch {
        setConfirm('expired');
      }
    })().catch(() => setConfirm('expired'));
  }, []);

  async function sendRestore(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setRestore('sending');
    try {
      const response = await fetch(`${PRO_API_URL}/pro/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setRestore(response.ok ? 'sent' : 'error');
    } catch {
      setRestore('error');
    }
  }

  const founderLine =
    remaining === undefined ? `First ${FOUNDER_CAP} only` : `${remaining} of ${FOUNDER_CAP} left`;

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '40px 24px 64px',
        display: 'grid',
        gap: 16,
      }}
    >
      <header>
        <p style={EYEBROW}>Gan stró · No fuss</p>
        <h1 style={{ ...DISPLAY, fontSize: 'clamp(36px, 8vw, 56px)', margin: '6px 0 10px' }}>
          Tonnta Pro
        </h1>
        <p style={{ margin: 0, maxWidth: 480, fontSize: 16, lineHeight: 1.55, color: '#C6D2D2' }}>
          The daily check — verdict, board call, week ahead, buoy and tides — stays free forever.
          Pro is the alerts: we watch the sea every hour and wake you when it&apos;s worth going
          down.
        </p>
      </header>

      {confirm !== 'none' ? (
        <div
          role="status"
          style={{
            ...CARD,
            borderColor: confirm === 'confirmed' ? '#8FC1B5' : 'rgba(232,163,61,0.4)',
            padding: 16,
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: '#C6D2D2' }}>
            {confirm === 'confirming' ? 'Linking this device to your purchase…' : null}
            {confirm === 'confirmed' ? 'Done — this device now gets Pro alerts.' : null}
            {confirm === 'needs-alerts'
              ? 'Turn on alerts on the home screen first, then open the email link again.'
              : null}
            {confirm === 'expired' ? 'That link has expired — request a fresh one below.' : null}
          </p>
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}
      >
        <section style={CARD}>
          <h2 style={EYEBROW}>Bliantúil · Annual</h2>
          <p style={{ ...DISPLAY, fontSize: 40, margin: '10px 0 2px' }}>
            {formatEuro(PRICE_ANNUAL_EUR)}
            <span style={{ fontSize: 16, fontWeight: 500, color: '#A9BDBF' }}> / year</span>
          </p>
          <ul
            style={{
              margin: '12px 0 18px',
              padding: 0,
              listStyle: 'none',
              color: '#C6D2D2',
              fontSize: 14,
              lineHeight: 1.9,
            }}
          >
            <li>All alerts — surf, swim and tide windows</li>
            <li>Your own thresholds, not ours</li>
            <li>Every spot we add, alerted</li>
          </ul>
          <CheckoutButton href={CHECKOUT_URL_ANNUAL} label="Get Pro" />
        </section>

        <section style={{ ...CARD, borderColor: 'rgba(232,163,61,0.5)' }}>
          <h2 style={{ ...EYEBROW, color: '#E8A33D' }}>Bunaitheoir · Founder — {founderLine}</h2>
          <p style={{ ...DISPLAY, fontSize: 40, margin: '10px 0 2px' }}>
            {formatEuro(PRICE_FOUNDER_EUR)}
            <span style={{ fontSize: 16, fontWeight: 500, color: '#A9BDBF' }}> once</span>
          </p>
          <ul
            style={{
              margin: '12px 0 18px',
              padding: 0,
              listStyle: 'none',
              color: '#C6D2D2',
              fontSize: 14,
              lineHeight: 1.9,
            }}
          >
            <li>Everything in Pro, for good</li>
            <li>Covers today&apos;s features, always</li>
            <li>A thank-you for backing the build</li>
          </ul>
          <CheckoutButton href={CHECKOUT_URL_FOUNDER} label="Become a founder" />
        </section>
      </div>

      <section style={{ ...CARD, padding: 20 }}>
        <h2 style={EYEBROW}>Ceannaithe cheana? · Bought already?</h2>
        <p style={{ margin: '8px 0 12px', fontSize: 14, color: '#C6D2D2' }}>
          New phone or fresh browser — enter your checkout email and we&apos;ll send a link that
          switches alerts on here. No password, no account.
        </p>
        {restore === 'sent' ? (
          <p style={{ margin: 0, fontSize: 14, color: '#8FC1B5' }}>
            If that email has a purchase, a restore link is on its way.
          </p>
        ) : (
          <form
            onSubmit={(event) => void sendRestore(event)}
            style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              aria-label="Checkout email"
              style={{
                flex: '1 1 220px',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #31525F',
                background: '#0C1B22',
                color: '#E8ECEB',
                fontSize: 14,
              }}
            />
            <button
              type="submit"
              disabled={restore === 'sending'}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: '1px solid #31525F',
                background: 'transparent',
                color: '#A9BDBF',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {restore === 'sending' ? 'Sending…' : 'Send restore link'}
            </button>
          </form>
        )}
        {restore === 'error' ? (
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#C4553B' }}>
            That didn&apos;t send — try again in a moment.
          </p>
        ) : null}
      </section>

      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7, color: '#6E8A90' }}>
        Prices include VAT. The founder deal covers the features that exist at launch; big new
        things (like the Donabate camera) may be their own thing later.
      </p>
    </main>
  );
}
