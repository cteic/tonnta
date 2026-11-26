import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const swimView = readFileSync(new URL('./swim-view.tsx', import.meta.url), 'utf8');
const darkHero = readFileSync(new URL('./dark-hero.tsx', import.meta.url), 'utf8');
const outlookView = readFileSync(new URL('./outlook-view.tsx', import.meta.url), 'utf8');

describe('Native swimming safety presentation', () => {
  it('uses physical-condition titles and a distinct unknown title, including first light', () => {
    for (const source of [swimView, darkHero]) {
      expect(source).toContain('CALM CONDITIONS');
      expect(source).toContain('SOME CHOP');
      expect(source).toContain('CHECK LOCAL ADVICE');
      expect(source).not.toMatch(/PERFECT|GRAND/);
    }
  });

  it('keeps the water-quality notice independent of the verdict and measurements', () => {
    expect(swimView).toContain('<Body>{waterQualityMessage(waterQualityStatus)}</Body>');
    expect(swimView).toContain('hour.waveHeightM.toFixed(1)');
    expect(swimView).toContain('hour.windSpeedKmh');
    expect(swimView).toContain('<SeaTempCard seaTempC={hour.seaTempC} />');
    expect(swimView).toContain('Weather windows withheld.');
    expect(swimView).not.toContain('The sea needs to settle first.');
  });

  it('distinguishes withheld advice from hazardous weather and guards incoming verdicts', () => {
    expect(swimView).toMatch(
      /swim.withheld === 'water-quality-unknown'\s*\? '\$surfaceRaised'\s*: SWIM_SEA_TOKEN\[swim.verdict\]/
    );
    expect(swimView).toContain("waterQualityStatus: suppliedWaterQualityStatus = 'unchecked'");
    expect(swimView).toMatch(
      /waterQuality\?\.restrictionInPlace\s*\? 'restricted'\s*: suppliedWaterQualityStatus/
    );
    expect(swimView).toContain('applySwimWaterQuality(swim, waterQuality, waterQualityStatus)');
    expect(swimView).toContain('<SwimHero swim={guardedSwim}');
  });

  it('uses the unknown-state guard rather than legacy checked status to unlock windows', () => {
    expect(swimView).toMatch(
      /windows=\{\s*waterQualityStatus === 'restricted' \|\| isWaterQualityUnknown\(waterQualityStatus\)\s*\? \[\]\s*: windows/
    );
    expect(swimView).not.toMatch(/waterQualityStatus [!=]== 'checked'/);
  });

  it('describes future windows and first light as weather forecasts, not future water quality', () => {
    expect(swimView).toContain('<Eyebrow>Weather windows</Eyebrow>');
    expect(swimView).toContain('No windows are available from the current forecast.');
    expect(swimView).not.toContain('No calm-condition windows');
    for (const source of [swimView, darkHero]) {
      expect(source).toMatch(/modeled weather, not future water quality/);
      expect(source).toMatch(/before each visit/);
    }
  });

  it('derives swim state from the live clock and retains notices if the forecast expires', () => {
    expect(outlookView).toMatch(/swimOutlookAt\(\s*outlook,\s*clock\s*\)/);
    expect(outlookView).toContain('waterQualityStatus={waterQualityStatus}');
    expect(outlookView).toContain(
      "mode === 'swim' ? <Body>{waterQualityMessage(waterQualityStatus)}</Body>"
    );
  });
});
