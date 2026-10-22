'use client';

import { useEffect, useState } from 'react';

import {
  DEFAULT_ALERT_THRESHOLDS,
  buildSubscribePayload,
  detectAlertSupport,
  urlBase64ToUint8Array,
} from '@/lib/alerts';
import { ALERTS_URL, VAPID_PUBLIC_KEY } from '@/lib/site';
import { useAppTheme } from '@/themes/theme-context';

/**
 * Alert opt-in: one switch, no account. The push subscription endpoint is
 * the identity; the worker checks the forecast hourly and pings when
 * Donabate crosses the thresholds.
 */

type AlertState =
  'checking' | 'unsupported' | 'ios-install' | 'off' | 'working' | 'on' | 'denied' | 'error';

async function readyServiceWorker(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register('/sw.js');
  return navigator.serviceWorker.ready;
}

export function AlertCard({ spotId }: { spotId: string }) {
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const [state, setState] = useState<AlertState>('checking');

  useEffect(() => {
    const support = detectAlertSupport(navigator, window, navigator.userAgent);
    if (support === 'ios-needs-install') {
      setState('ios-install');
      return;
    }
    if (support === 'unsupported') {
      setState('unsupported');
      return;
    }
    readyServiceWorker()
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setState(subscription === null ? 'off' : 'on'))
      .catch(() => setState('error'));
  }, []);

  async function enable(): Promise<void> {
    setState('working');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState('denied');
        return;
      }
      const registration = await readyServiceWorker();
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const payload = buildSubscribePayload(
        subscription.toJSON(),
        spotId,
        DEFAULT_ALERT_THRESHOLDS
      );
      if (payload === undefined) {
        throw new Error('malformed subscription');
      }
      const response = await fetch(`${ALERTS_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`subscribe failed: ${response.status}`);
      }
      setState('on');
    } catch {
      setState('error');
    }
  }

  async function disable(): Promise<void> {
    setState('working');
    try {
      const registration = await readyServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription !== null) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await fetch(`${ALERTS_URL}/subscribe`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint, p256dh: 'x', auth_key: 'x' }),
        });
      }
      setState('off');
    } catch {
      setState('error');
    }
  }

  const copy: Record<AlertState, string> = {
    checking: 'Checking this browser…',
    unsupported: "This browser can't receive push alerts — try Chrome, Edge or Firefox.",
    'ios-install':
      'On iPhone, add Tonnta to your home screen first (Share → Add to Home Screen), then turn alerts on from there.',
    off: `Get a push when it's on — waves over ${DEFAULT_ALERT_THRESHOLDS.minWaveM}m and the wind behaving. No account needed.`,
    working: 'Setting up…',
    on: "You're on the list — we check every hour and ping you when Donabate wakes up.",
    denied:
      'Notifications are blocked for this site — allow them in your browser settings to get alerts.',
    error: "That didn't work — try again in a moment.",
  };

  return (
    <section
      style={{
        background: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 16,
        padding: 20,
        borderColor: tokens.accentBorder,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: tokens.textSubtle,
        }}
      >
        Fógraí · Alerts
      </h2>
      <p style={{ margin: '10px 0 14px', fontSize: 14, lineHeight: 1.55, color: tokens.textMuted }}>
        {copy[state]}
      </p>
      {state === 'off' || state === 'error' ? (
        <button
          type="button"
          onClick={() => {
            void enable();
          }}
          style={{
            padding: '10px 20px',
            borderRadius: 999,
            border: 'none',
            background: tokens.accent,
            color: tokens.accentContrast,
            fontFamily: "'Clash Display', sans-serif",
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Alert me when it&apos;s on
        </button>
      ) : null}
      {state === 'on' ? (
        <button
          type="button"
          onClick={() => {
            void disable();
          }}
          style={{
            padding: '8px 16px',
            borderRadius: 999,
            border: `1px solid ${tokens.border}`,
            background: 'transparent',
            color: tokens.textSoft,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Turn alerts off
        </button>
      ) : null}
    </section>
  );
}
