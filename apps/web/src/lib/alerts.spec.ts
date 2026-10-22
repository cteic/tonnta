import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { AlertSupport, SubscribePayload } from './alerts';
import { buildSubscribePayload, detectAlertSupport, urlBase64ToUint8Array } from './alerts';

const feature = await loadFeature('./alerts.feature');

const VALID_SUBSCRIPTION = {
  endpoint: 'https://push.example/sub/abc123',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
};

describeFeature(feature, ({ Scenario }) => {
  Scenario('A valid browser subscription becomes a subscribe payload', ({ Given, When, Then }) => {
    let input: unknown;
    let payload: SubscribePayload | undefined;

    Given('a push subscription with an endpoint and both keys', () => {
      input = VALID_SUBSCRIPTION;
    });
    When('I build the subscribe payload for donabate', () => {
      payload = buildSubscribePayload(input, 'donabate');
    });
    Then('the payload carries the endpoint, keys and default thresholds', () => {
      expect(payload).toEqual({
        endpoint: 'https://push.example/sub/abc123',
        p256dh: 'p256dh-key',
        auth_key: 'auth-key',
        spot_id: 'donabate',
        min_wave_m: 0.4,
        max_wind_kmh: 25,
      });
    });
  });

  Scenario('A subscription missing keys is rejected', ({ Given, When, Then }) => {
    let input: unknown;
    let payload: SubscribePayload | undefined;

    Given('a push subscription with an endpoint but no keys', () => {
      input = { endpoint: 'https://push.example/sub/abc123' };
    });
    When('I build the subscribe payload for donabate', () => {
      payload = buildSubscribePayload(input, 'donabate');
    });
    Then('no payload is produced', () => {
      expect(payload).toBeUndefined();
    });
  });

  Scenario('A subscription with an empty endpoint is rejected', ({ Given, When, Then }) => {
    let input: unknown;
    let payload: SubscribePayload | undefined;

    Given('a push subscription with an empty endpoint', () => {
      input = { ...VALID_SUBSCRIPTION, endpoint: '' };
    });
    When('I build the subscribe payload for donabate', () => {
      payload = buildSubscribePayload(input, 'donabate');
    });
    Then('no payload is produced', () => {
      expect(payload).toBeUndefined();
    });
  });

  Scenario('Custom thresholds are carried through', ({ Given, When, Then }) => {
    let input: unknown;
    let payload: SubscribePayload | undefined;

    Given('a push subscription with an endpoint and both keys', () => {
      input = VALID_SUBSCRIPTION;
    });
    When('I build the subscribe payload with a 0.6m wave threshold', () => {
      payload = buildSubscribePayload(input, 'donabate', { minWaveM: 0.6, maxWindKmh: 20 });
    });
    Then('the payload asks for waves of at least 0.6m', () => {
      expect(payload?.min_wave_m).toBe(0.6);
      expect(payload?.max_wind_kmh).toBe(20);
    });
  });

  Scenario('The VAPID key decodes to bytes', ({ Given, When, Then }) => {
    let key = '';
    let bytes: Uint8Array | undefined;

    Given('a url-safe base64 VAPID public key', () => {
      // "hello" in url-safe base64
      key = 'aGVsbG8';
    });
    When('I decode it', () => {
      bytes = urlBase64ToUint8Array(key);
    });
    Then('I get a byte array matching the key contents', () => {
      expect(Array.from(bytes ?? [])).toEqual([104, 101, 108, 108, 111]);
    });
  });

  Scenario('iOS Safari in the browser is told to install first', ({ Given, When, Then }) => {
    let support: AlertSupport | undefined;
    let ua = '';

    Given('an iPhone browser without push APIs', () => {
      ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';
    });
    When('I detect alert support', () => {
      support = detectAlertSupport({}, {}, ua);
    });
    Then('support is ios-needs-install', () => {
      expect(support).toBe('ios-needs-install');
    });
  });

  Scenario('A browser with push APIs is supported', ({ Given, When, Then }) => {
    let support: AlertSupport | undefined;

    Given('a browser with service worker and push APIs', () => {
      // simulated below
    });
    When('I detect alert support', () => {
      support = detectAlertSupport({ serviceWorker: {} }, { PushManager: {} }, 'Mozilla/5.0');
    });
    Then('support is supported', () => {
      expect(support).toBe('supported');
    });
  });
});
