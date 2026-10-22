import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { TokenRow } from './pro';
import { compareTokens, founderRemaining, isTokenValid, parseRestoreBody } from './pro';

const feature = await loadFeature('./pro.feature');

const NOW = Date.parse('2026-07-03T12:00:00Z');

function tokenRow(offsetMinutes: number, used: boolean): TokenRow {
  return {
    email: 'pete@cteic.ie',
    expires_at: new Date(NOW + offsetMinutes * 60 * 1000).toISOString(),
    used_at: used ? new Date(NOW - 60 * 1000).toISOString() : null,
  };
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
});
