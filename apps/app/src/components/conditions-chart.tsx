import { useMemo, useRef, useState } from 'react';

import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';

import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { Verdict } from '@tonnta/types';
import { Text, XStack, YStack } from '@tonnta/ui';
import { colors } from '@tonnta/ui/theme';

import type { ChartBox } from '@/chart/chart-geometry';
import { buildChartGeometry, hourIndexAt, longestGoRun } from '@/chart/chart-geometry';
import type { ChartHour } from '@/lib/conditions';
import { BOARD_LABEL, VERDICT_LABEL, formatDayName, formatHour } from '@/lib/format';

import { Eyebrow } from './screen';

const HEIGHT = 168;
const BOX_MARGINS = { top: 12, right: 8, bottom: 22, left: 8 };

const BAND_COLOUR: Record<Verdict, string> = {
  go: colors.seaClean,
  maybe: colors.seaMarginal,
  flat: colors.seaFlat,
  blown: colors.seaBlown,
};

interface ConditionsChartProps {
  hours: ChartHour[];
  timezone: string;
}

/**
 * The next 24 hours: wave height over verdict-coloured bands, wind as a
 * second line. Drag across it to read any hour.
 */
export function ConditionsChart({ hours, timezone }: ConditionsChartProps) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(0);
  // Page x of the chart's left edge, taken when a touch starts. Move events
  // report locationX against whichever child is under the finger on Android,
  // so scrubbing tracks pageX against this instead.
  const originX = useRef(0);

  const box: ChartBox = { width, height: HEIGHT, ...BOX_MARGINS };
  const geometry = useMemo(
    () => buildChartGeometry(hours, { width, height: HEIGHT, ...BOX_MARGINS }),
    [hours, width]
  );

  if (hours.length === 0) return null;

  const hour = hours[Math.min(selected, hours.length - 1)] ?? hours[0];
  if (hour === undefined) return null;
  const marker = geometry.centres[Math.min(selected, hours.length - 1)] ?? 0;
  const goRun = longestGoRun(hours);
  const summary =
    goRun === undefined
      ? 'No GO hours in the next 24 hours.'
      : `GO from ${formatHour(goRun.start, timezone)} to ${formatHour(goRun.end, timezone)}.`;

  const select = (x: number) => setSelected(hourIndexAt(x, hours.length, box));
  const startScrub = (event: GestureResponderEvent) => {
    originX.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
    select(event.nativeEvent.locationX);
  };
  const moveScrub = (event: GestureResponderEvent) => {
    select(event.nativeEvent.pageX - originX.current);
  };

  return (
    <YStack gap="$4">
      <Eyebrow>Next 24 hours</Eyebrow>
      <XStack gap="$4" alignItems="baseline" flexWrap="wrap" accessibilityLiveRegion="polite">
        <Text fontFamily="$display" fontSize="$4" fontWeight="600" color="$color">
          {`${formatDayName(hour.time, timezone)} ${formatHour(hour.time, timezone)}`}
        </Text>
        <Text fontFamily="$mono" fontSize="$4" color="$color">
          {`${hour.waveHeightM.toFixed(1)}m · ${Math.round(hour.windSpeedKmh)}km/h`}
        </Text>
        <Text
          fontFamily="$body"
          fontSize="$4"
          fontWeight="600"
          color={hour.verdict === 'go' ? '$accent' : '$colorMuted'}
        >
          {hour.board === undefined
            ? VERDICT_LABEL[hour.verdict].english
            : `${VERDICT_LABEL[hour.verdict].english} · ${BOARD_LABEL[hour.board]}`}
        </Text>
      </XStack>
      <View
        testID="conditions-chart"
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Wave height and wind for the next 24 hours. Waves up to ${geometry.waveMaxM} metres. ${summary}`}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={startScrub}
        onResponderMove={moveScrub}
        style={{ height: HEIGHT }}
      >
        {width > 0 ? (
          <Svg width={width} height={HEIGHT} pointerEvents="none">
            {geometry.bands.map((band) => (
              <Rect
                key={band.x}
                x={band.x}
                y={BOX_MARGINS.top}
                width={Math.max(band.width - 1, 0)}
                height={HEIGHT - BOX_MARGINS.top - BOX_MARGINS.bottom}
                fill={BAND_COLOUR[band.verdict]}
                opacity={0.35}
              />
            ))}
            <Path d={geometry.waveArea} fill={colors.fog} opacity={0.18} />
            <Path d={geometry.waveLine} stroke={colors.fog} strokeWidth={2} fill="none" />
            <Path
              d={geometry.windLine}
              stroke={colors.mutedOnDark}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="none"
            />
            <Line
              x1={marker}
              x2={marker}
              y1={BOX_MARGINS.top}
              y2={HEIGHT - BOX_MARGINS.bottom}
              stroke={colors.dawnAmber}
              strokeWidth={2}
            />
            {geometry.ticks.map((tick) => (
              <SvgText
                key={tick.time}
                x={tick.x}
                y={HEIGHT - 6}
                fontSize={11}
                fill={colors.mutedOnDark}
                textAnchor="middle"
              >
                {formatHour(tick.time, timezone)}
              </SvgText>
            ))}
          </Svg>
        ) : null}
      </View>
      <XStack gap="$6" flexWrap="wrap">
        <Text fontFamily="$body" fontSize="$2" color="$colorMuted">
          {`── waves (to ${geometry.waveMaxM}m)`}
        </Text>
        <Text fontFamily="$body" fontSize="$2" color="$colorMuted">
          {`- - wind (to ${geometry.windMaxKmh}km/h)`}
        </Text>
      </XStack>
    </YStack>
  );
}
