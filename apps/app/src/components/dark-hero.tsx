import Svg, { Circle } from 'react-native-svg';

import type { Spot, SwimVerdictResult, VerdictResult } from '@tonnta/types';
import { Text, XStack, YStack } from '@tonnta/ui';

import { VERDICT_LABEL, formatHour } from '@/lib/format';

import { Body, Eyebrow } from './screen';

const SWIM_LABEL: Record<SwimVerdictResult['verdict'], string> = {
  great: 'PERFECT',
  ok: 'GRAND',
  no: 'NOT TODAY',
};

interface DarkHeroProps {
  spot: Spot;
  mode: 'surf' | 'swim';
  sunrise?: string | undefined;
  firstLightTime?: string | undefined;
  surf?: VerdictResult | undefined;
  swim?: SwimVerdictResult | undefined;
}

function firstLightPreview(
  mode: 'surf' | 'swim',
  surf: VerdictResult | undefined,
  swim: SwimVerdictResult | undefined
): string | undefined {
  if (mode === 'surf') {
    return surf === undefined
      ? undefined
      : `${VERDICT_LABEL[surf.verdict].english}. ${surf.reason}`;
  }
  return swim === undefined ? undefined : `${SWIM_LABEL[swim.verdict]}. ${swim.reason}`;
}

/**
 * After dark there is no verdict: nobody should be in the water. The hero
 * gives the next sunrise and what first light looks like instead.
 */
export function DarkHero({ spot, mode, sunrise, firstLightTime, surf, swim }: DarkHeroProps) {
  const preview = firstLightPreview(mode, surf, swim);
  // The first light hour can start a few minutes before sunrise; never show a time before it.
  const firstLightAt =
    firstLightTime !== undefined && sunrise !== undefined && sunrise > firstLightTime
      ? sunrise
      : firstLightTime;
  return (
    <YStack gap="$4" padding="$10" borderRadius="$6" backgroundColor="#070F14" testID="dark-hero">
      <XStack justifyContent="space-between" alignItems="flex-start">
        <Eyebrow>Dorcha · Dark</Eyebrow>
        <Svg width={44} height={44} viewBox="0 0 120 120" accessibilityElementsHidden>
          <Circle cx={64} cy={56} r={30} fill="#E8ECEB" />
          <Circle cx={78} cy={46} r={28} fill="#070F14" />
        </Svg>
      </XStack>
      <Text
        accessibilityRole="header"
        testID="verdict-heading"
        fontFamily="$display"
        fontSize="$7"
        lineHeight="$7"
        fontWeight="700"
        letterSpacing={-1.5}
        color="$color"
      >
        Out of the water
      </Text>
      <Body>
        {`It is dark at ${spot.name}, so there is no verdict until it is light.${
          sunrise !== undefined ? ` Sunrise is at ${formatHour(sunrise, spot.timezone)}.` : ''
        }`}
      </Body>
      {preview !== undefined && firstLightAt !== undefined ? (
        <YStack padding="$6" borderRadius="$4" backgroundColor="$surfaceRaised" gap="$2">
          <Text fontFamily="$body" fontSize="$3" fontWeight="700" color="$color">
            {`First light, ${formatHour(firstLightAt, spot.timezone)}`}
          </Text>
          <Body muted>{preview}</Body>
        </YStack>
      ) : null}
    </YStack>
  );
}
