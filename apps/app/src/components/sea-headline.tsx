import { useEffect, useRef, useState } from 'react';

import type { LayoutChangeEvent } from 'react-native';
import { AccessibilityInfo, Animated, View } from 'react-native';

import Svg, { Path } from 'react-native-svg';

import { firstLightLabel } from '@tonnta/data';
import type { HourlyConditions, Spot, Verdict } from '@tonnta/types';
import { Text, XStack, YStack } from '@tonnta/ui';
import { colors } from '@tonnta/ui/theme';

import { WIND_STATE_LABEL, formatHour } from '@/lib/format';
import type { SeaBand } from '@/lib/sea-bands';
import { seaBandPath, seaBands } from '@/lib/sea-bands';
import type { SurfRating } from '@/lib/surf-forecast';
import { SURF_RATING_GUIDANCE, surfConditionsLine, surfRating } from '@/lib/surf-forecast';

const SEA_HEIGHT = 96;

const RATING_SEA: Record<Verdict, string> = {
  go: colors.seaClean,
  maybe: colors.seaMarginal,
  flat: colors.seaFlat,
  blown: colors.seaBlown,
};

function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  return reduceMotion;
}

interface DriftingBandProps {
  band: SeaBand;
  width: number;
  colour: string;
  still: boolean;
}

/** One band, drawn a wavelength wider than the card and slid by exactly one wavelength. */
function DriftingBand({ band, width, colour, still }: DriftingBandProps) {
  const shift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    shift.setValue(0);
    if (still) return undefined;
    const drift = Animated.loop(
      Animated.timing(shift, {
        toValue: -band.wavelength,
        duration: band.cycleS * 1000,
        useNativeDriver: true,
        isInteraction: false,
      })
    );
    drift.start();
    return () => drift.stop();
  }, [band.cycleS, band.wavelength, shift, still]);

  const drawnWidth = width + band.wavelength * 2;
  return (
    <Animated.View
      style={{ position: 'absolute', left: 0, bottom: 0, transform: [{ translateX: shift }] }}
    >
      <Svg width={drawnWidth} height={SEA_HEIGHT}>
        <Path
          d={seaBandPath(band, drawnWidth, 36 + band.offsetY / 2, SEA_HEIGHT)}
          fill={colour}
          opacity={band.opacity}
        />
      </Svg>
    </Animated.View>
  );
}

interface LivingSeaProps {
  hour: HourlyConditions | undefined;
  colour: string;
}

function LivingSea({ hour, colour }: LivingSeaProps) {
  const [width, setWidth] = useState(0);
  const still = useReduceMotion();
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  return (
    <View
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      onLayout={onLayout}
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: SEA_HEIGHT }}
    >
      {width === 0
        ? null
        : seaBands(hour).map((band) => (
            <DriftingBand
              key={band.offsetY}
              band={band}
              width={width}
              colour={colour}
              still={still}
            />
          ))}
    </View>
  );
}

interface SeaHeadlineProps {
  spot: Spot;
  current: HourlyConditions | undefined;
  dark: boolean;
  sunrise: string | undefined;
  firstLight: HourlyConditions | undefined;
  loadedAt: number;
}

function whenLabel(props: SeaHeadlineProps): string {
  const { spot, current, dark, sunrise, firstLight } = props;
  if (!dark) {
    return current === undefined
      ? 'Surf now'
      : `Surf now · ${formatHour(current.time, spot.timezone)}`;
  }
  if (firstLight !== undefined) {
    return `Dark now · First light ${firstLightLabel(firstLight.time, sunrise, spot.timezone)}`;
  }
  return sunrise === undefined
    ? 'Dark now'
    : `Dark now · Sunrise ${formatHour(sunrise, spot.timezone)}`;
}

function detailLine(hour: HourlyConditions): string {
  return `${Math.round(hour.wavePeriodS)} s · ${Math.round(hour.windSpeedKmh)} km/h ${WIND_STATE_LABEL[hour.windState]}`;
}

interface RatingChipProps {
  rating: SurfRating;
}

function RatingChip({ rating }: RatingChipProps) {
  return (
    <XStack
      testID="surf-rating"
      alignSelf="flex-start"
      paddingHorizontal="$5"
      paddingVertical="$2"
      borderRadius="$7"
      backgroundColor={RATING_SEA[rating.verdict]}
    >
      <Text fontFamily="$display" fontSize="$2" fontWeight="700" color={colors.harbour}>
        {rating.quality}
      </Text>
    </XStack>
  );
}

/**
 * The compact headline: when, the surf-quality rating, the wave height as the
 * big figure, period and wind on one line, the reason, and the living sea
 * underneath. After dark it previews first light instead of the dark hour.
 */
export function SeaHeadline(props: SeaHeadlineProps) {
  const { spot, current, dark, loadedAt } = props;
  const subject = dark ? props.firstLight : current;
  const rating = subject === undefined ? undefined : surfRating(subject, spot);
  const seaColour = rating === undefined ? colors.seaMarginal : RATING_SEA[rating.verdict];

  return (
    <View
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 24,
        backgroundColor: colors.seaNight,
        paddingBottom: SEA_HEIGHT - 28,
      }}
    >
      <YStack gap="$3" paddingHorizontal="$8" paddingTop="$7" zIndex={1}>
        <XStack justifyContent="space-between" alignItems="center" gap="$3" flexWrap="wrap">
          <Text
            accessibilityRole="header"
            testID="surf-forecast-heading"
            fontFamily="$body"
            fontSize="$2"
            fontWeight="600"
            letterSpacing={1.2}
            textTransform="uppercase"
            color="$colorMuted"
          >
            {whenLabel(props)}
          </Text>
          {rating === undefined ? null : <RatingChip rating={rating} />}
        </XStack>
        {subject === undefined ? (
          <Text fontFamily="$body" fontSize="$5" color="$color">
            {dark ? 'First-light forecast unavailable.' : 'Forecast unavailable for this hour.'}
          </Text>
        ) : (
          <YStack
            gap="$1"
            accessible
            accessibilityLabel={`${rating === undefined ? '' : `${rating.quality}. `}${surfConditionsLine(subject)}.`}
          >
            <Text
              fontFamily="$display"
              fontSize={64}
              lineHeight={66}
              fontWeight="700"
              letterSpacing={-2}
              color="$color"
            >
              {`${subject.waveHeightM.toFixed(1)} m`}
            </Text>
            <Text fontFamily="$mono" fontSize="$4" color="$color">
              {detailLine(subject)}
            </Text>
          </YStack>
        )}
        {rating === undefined ? null : (
          <Text fontFamily="$body" fontSize="$4" lineHeight="$4" color="$color">
            {rating.reason}
          </Text>
        )}
        <Text
          testID="surf-rating-guidance"
          fontFamily="$body"
          fontSize="$2"
          lineHeight="$2"
          color="$colorMuted"
        >
          {`${rating === undefined ? '' : `${SURF_RATING_GUIDANCE} `}Open-Meteo estimate, checked ${formatHour(new Date(loadedAt).toISOString(), spot.timezone)}.`}
        </Text>
      </YStack>
      <LivingSea hour={subject} colour={seaColour} />
    </View>
  );
}
