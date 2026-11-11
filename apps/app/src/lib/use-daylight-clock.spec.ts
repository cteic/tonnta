import { describe, expect, it, vi } from 'vitest';

import { clockUpdateDelay } from './use-daylight-clock';

vi.mock('react-native', () => ({ AppState: {} }));

describe('Native advice expiry scheduling', () => {
  it('wakes exactly at an imminent water-quality or forecast deadline', () => {
    expect(clockUpdateDelay(1_000, [3_600_000, 30_000, 15_000])).toBe(14_000);
    expect(clockUpdateDelay(1_000, [1_001])).toBe(1);
  });

  it('keeps the minute cap and ignores expired or non-finite deadlines', () => {
    expect(clockUpdateDelay(1_000, [undefined, Number.NaN, Infinity, 1_000, 999])).toBe(60_000);
    expect(clockUpdateDelay(1_000, [3_600_000])).toBe(60_000);
  });

  it('samples after an inclusive sunset boundary without delaying notice expiry', () => {
    expect(clockUpdateDelay(1_000, [], [1_000])).toBe(1);
    expect(clockUpdateDelay(999, [], [1_000])).toBe(2);
    expect(clockUpdateDelay(999, [1_000], [1_000])).toBe(1);
  });
});
