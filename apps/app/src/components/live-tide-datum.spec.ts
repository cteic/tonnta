import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./live-tide-card.tsx', import.meta.url), 'utf8');

describe('Native live tide datum label', () => {
  it('labels the unchanged gauge height as OD Malin, not mean sea level', () => {
    expect(source).toContain('formatLevel(latest.levelM)');
    expect(source).toContain('<Body muted>Height relative to OD Malin.</Body>');
    expect(source).not.toContain('mean sea level');
  });
});
