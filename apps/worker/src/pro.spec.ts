import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect, vi } from 'vitest';

import type { TokenRow } from './pro';
import {
  compareTokens,
  founderRemaining,
  handleConfirm,
  handleRestore,
  isTokenValid,
  parseRestoreBody,
} from './pro';
import type { TestDatabase } from './testing/sqlite-d1';
import { createTestDatabase } from './testing/sqlite-d1';

const feature = await loadFeature('./pro.feature');

const NOW = Date.parse('2026-07-03T12:00:00Z');

function tokenRow(offsetMinutes: number, used: boolean): TokenRow {
  return {
    email: 'pete@cteic.ie',
    expires_at: new Date(NOW + offsetMinutes * 60 * 1000).toISOString(),
    used_at: used ? new Date(NOW - 60 * 1000).toISOString() : null,
  };
}

const EMAIL = 'surfer@example.com';
const TOKEN = 'a'.repeat(64);

function seedPurchase(db: TestDatabase): void {
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.exec(
    `INSERT INTO entitlements (email, tier) VALUES ('${EMAIL}', 'founder');
     INSERT INTO magic_tokens (token, email, expires_at) VALUES ('${TOKEN}', '${EMAIL}', '${expires}');`
  );
}

function subscribe(db: TestDatabase, endpoint: string): void {
  db.exec(
    `INSERT INTO alert_subscriptions (endpoint, p256dh, auth_key) VALUES ('${endpoint}', 'k', 'a');`
  );
}

function confirm(db: TestDatabase, endpoint: string): Promise<Response> {
  const url = `https://worker.test/pro/confirm?token=${TOKEN}&endpoint=${encodeURIComponent(endpoint)}`;
  return handleConfirm(
    new Request(url),
    { DB: db },
    (body, status) => new Response(JSON.stringify(body), { status })
  );
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('An unused token before expiry is valid', ({ Given, When, Then }) => {
    let row: TokenRow | undefined;
    let valid = false;

    Given('a magic token expiring in 10 minutes', () => {
      row = tokenRow(10, false);
    });
    When('I validate it now', () => {
      if (row === undefined) throw new Error('no token row');
      valid = isTokenValid(row, NOW);
    });
    Then('the token is accepted', () => {
      expect(valid).toBe(true);
    });
  });

  Scenario('An expired token is rejected', ({ Given, When, Then }) => {
    let row: TokenRow | undefined;
    let valid = true;

    Given('a magic token that expired 1 minute ago', () => {
      row = tokenRow(-1, false);
    });
    When('I validate it now', () => {
      if (row === undefined) throw new Error('no token row');
      valid = isTokenValid(row, NOW);
    });
    Then('the token is rejected', () => {
      expect(valid).toBe(false);
    });
  });

  Scenario('A used token is rejected even before expiry', ({ Given, When, Then }) => {
    let row: TokenRow | undefined;
    let valid = true;

    Given('a magic token expiring in 10 minutes that was already used', () => {
      row = tokenRow(10, true);
    });
    When('I validate it now', () => {
      if (row === undefined) throw new Error('no token row');
      valid = isTokenValid(row, NOW);
    });
    Then('the token is rejected', () => {
      expect(valid).toBe(false);
    });
  });

  Scenario('Founder remaining counts down from the cap', ({ Given, When, Then }) => {
    let sold = 0;
    let remaining = -1;

    Given('37 founder purchases', () => {
      sold = 37;
    });
    When('I compute the remaining founder slots', () => {
      remaining = founderRemaining(sold);
    });
    Then('63 slots remain', () => {
      expect(remaining).toBe(63);
    });
  });

  Scenario('Founder remaining never goes below zero', ({ Given, When, Then }) => {
    let sold = 0;
    let remaining = -1;

    Given('250 founder purchases', () => {
      sold = 250;
    });
    When('I compute the remaining founder slots', () => {
      remaining = founderRemaining(sold);
    });
    Then('0 slots remain', () => {
      expect(remaining).toBe(0);
    });
  });

  Scenario('Token comparison accepts only an exact match', ({ Given, When, Then }) => {
    const stored = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
    let exact = false;
    let nearMiss = true;

    Given('a stored token', () => {
      // stored above
    });
    When('I compare it against itself and against a near-miss', () => {
      exact = compareTokens(stored, stored);
      nearMiss = compareTokens(stored, `${stored.slice(0, -1)}1`);
    });
    Then('only the exact match is accepted', () => {
      expect(exact).toBe(true);
      expect(nearMiss).toBe(false);
    });
  });

  Scenario('A valid email is normalised for restore', ({ Given, When, Then }) => {
    let payload: unknown;
    let parsed: { email: string } | undefined;

    Given('a restore request for " Pete@CTEIC.ie "', () => {
      payload = { email: ' Pete@CTEIC.ie ' };
    });
    When('I parse the restore body', () => {
      parsed = parseRestoreBody(payload);
    });
    Then('the email is pete@cteic.ie', () => {
      expect(parsed?.email).toBe('pete@cteic.ie');
    });
  });

  Scenario('A junk restore payload is rejected', ({ Given, When, Then }) => {
    let payload: unknown;
    let parsed: { email: string } | undefined;

    Given('a restore request without a usable email', () => {
      payload = { email: 'not-an-email' };
    });
    When('I parse the restore body', () => {
      parsed = parseRestoreBody(payload);
    });
    Then('no restore email is produced', () => {
      expect(parsed).toBeUndefined();
    });
  });

  Scenario(
    'Two requests with one restore link link only one device',
    ({ Given, When, Then, And }) => {
      const db = createTestDatabase();
      let statuses: number[] = [];

      Given('a Pro purchase, a fresh restore link and two devices with alerts on', () => {
        seedPurchase(db);
        subscribe(db, 'https://push.test/a');
        subscribe(db, 'https://push.test/b');
      });
      When('both devices open the link at the same moment', async () => {
        const responses = await Promise.all([
          confirm(db, 'https://push.test/a'),
          confirm(db, 'https://push.test/b'),
        ]);
        statuses = responses.map((response) => response.status).sort();
      });
      Then('exactly one device is linked to the purchase', () => {
        const linked = db.query(
          `SELECT endpoint FROM alert_subscriptions WHERE entitlement_email = '${EMAIL}'`
        );
        expect(linked).toHaveLength(1);
      });
      And('the other request is told the link has expired', () => {
        expect(statuses).toEqual([200, 400]);
      });
    }
  );

  Scenario(
    'A link opened before alerts are on still works afterwards',
    ({ Given, When, Then, And }) => {
      const db = createTestDatabase();
      let first = 0;
      let second = 0;

      Given('a Pro purchase and a fresh restore link', () => {
        seedPurchase(db);
      });
      When('a device opens the link before turning alerts on', async () => {
        first = (await confirm(db, 'https://push.test/c')).status;
      });
      And('it turns alerts on and opens the link again', async () => {
        subscribe(db, 'https://push.test/c');
        second = (await confirm(db, 'https://push.test/c')).status;
      });
      Then('the first attempt asks it to turn alerts on', () => {
        expect(first).toBe(409);
      });
      And('the second attempt links the device', () => {
        expect(second).toBe(200);
      });
    }
  );
  Scenario(
    'A failing email provider gives a buyer the same reply as anyone else',
    ({ Given, When, Then }) => {
      let db: TestDatabase | undefined;
      const replies: { status: number; body: string }[] = [];
      Given('a Pro purchase and an email provider that is down', () => {
        db = createTestDatabase();
        seedPurchase(db);
      });
      When('the buyer and a stranger each ask for a restore link', async () => {
        if (db === undefined) throw new Error('database not seeded');
        const store = new Map<string, string>();
        const env = {
          DB: db,
          CACHE: {
            get: async (key: string) => store.get(key) ?? null,
            put: async (key: string, value: string) => {
              store.set(key, value);
            },
          },
          SITE_ORIGIN: 'https://tonnta.test',
        };
        const down = {
          send: async () => {
            throw new Error('Resend: HTTP 503');
          },
        };
        for (const email of [EMAIL, 'stranger@example.com']) {
          const response = await handleRestore(
            new Request('https://worker.test/pro/restore', {
              method: 'POST',
              body: JSON.stringify({ email }),
            }),
            env,
            (body, status) => new Response(JSON.stringify(body), { status }),
            down
          );
          replies.push({ status: response.status, body: await response.text() });
        }
      });
      Then('both get the same 200 reply', () => {
        expect(replies[0]?.status).toBe(200);
        expect(replies[0]).toEqual(replies[1]);
      });
    }
  );

  function restoreWithoutEmailKeys(
    Given: (name: string, step: () => void) => void,
    When: (name: string, step: () => Promise<void>) => void,
    Then: (name: string, step: () => void) => void,
    given: string,
    siteOrigin: string
  ): { logged: () => string } {
    let db: TestDatabase | undefined;
    let status = 0;
    const lines: string[] = [];
    Given(given, () => {
      db = createTestDatabase();
      seedPurchase(db);
    });
    When('the buyer asks for a restore link', async () => {
      if (db === undefined) throw new Error('database not seeded');
      const store = new Map<string, string>();
      const capture = (...parts: unknown[]): void => {
        lines.push(parts.map(String).join(' '));
      };
      const spies = [
        vi.spyOn(console, 'log').mockImplementation(capture),
        vi.spyOn(console, 'info').mockImplementation(capture),
        vi.spyOn(console, 'warn').mockImplementation(capture),
        vi.spyOn(console, 'error').mockImplementation(capture),
      ];
      try {
        const response = await handleRestore(
          new Request('https://worker.test/pro/restore', {
            method: 'POST',
            body: JSON.stringify({ email: EMAIL }),
          }),
          {
            DB: db,
            CACHE: {
              get: async (key: string) => store.get(key) ?? null,
              put: async (key: string, value: string) => {
                store.set(key, value);
              },
            },
            SITE_ORIGIN: siteOrigin,
          },
          (body, code) => new Response(JSON.stringify(body), { status: code })
        );
        status = response.status;
      } finally {
        for (const spy of spies) spy.mockRestore();
      }
    });
    Then('the reply is the usual 200', () => {
      expect(status).toBe(200);
    });
    return { logged: () => lines.join('\n') };
  }

  Scenario(
    'A deployed worker with no email keys never logs the restore link',
    ({ Given, When, Then, And }) => {
      const { logged } = restoreWithoutEmailKeys(
        Given,
        When,
        Then,
        'a Pro purchase on a deployed worker with no email keys',
        'https://tonnta.surf'
      );
      And('no log line contains the restore link', () => {
        expect(logged()).not.toContain('/pro?token=');
        expect(logged()).toContain('email is not configured');
      });
    }
  );
  Scenario(
    'A local worker with no email keys logs the restore link',
    ({ Given, When, Then, And }) => {
      const { logged } = restoreWithoutEmailKeys(
        Given,
        When,
        Then,
        'a Pro purchase on a local worker with no email keys',
        'http://localhost:3000'
      );
      And('a log line contains the restore link', () => {
        expect(logged()).toContain('http://localhost:3000/pro?token=');
      });
    }
  );
});
