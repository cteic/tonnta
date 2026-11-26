import { useMemo, useRef, useState } from 'react';

import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { View } from 'react-native';

import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import type { Verdict } from '@tonnta/types';
import { Text, XStack, YStack } from '@tonnta/ui';
import { colors } from '@tonnta/ui/theme';

import type { ChartBox } from '@/chart/chart-geometry';
import { buildChartGeometry, hourIndexAt, longestGoRun } from '@/chart/chart-geometry';
import { useAnalytics } from '@/lib/analytics';
import { chartScrubbed } from '@/lib/analytics-events';
import type { ChartHour } from '@/lib/conditions';
import {
  BOARD_LABEL,
  VERDICT_LABEL,
  formatDayName,
  formatHour,
  formatHourRange,
} from '@/lib/format';
import type { SurfChartHour } from '@/lib/surf-forecast';
import { surfChartHourLabel } from '@/lib/surf-forecast';

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
  spotId: string;
  timezone: string;
}

type ChartProps = ConditionsChartProps &
  ({ mode: 'surf'; hours: SurfChartHour[] } | { mode?: undefined; hours: ChartHour[] });

function webHourLabel(hour: ChartHour): string {
  if (!hour.daylight) return 'Outside full daylight hours';
  const verdict = VERDICT_LABEL[hour.verdict].english;
  return hour.board === undefined ? verdict : `${verdict} · ${BOARD_LABEL[hour.board]}`;
}

function webChartSummary(hours: ChartHour[], timezone: string): string {
  const goRun = longestGoRun(hours);
  return goRun === undefined
    ? 'No daylight GO hours in the next 24 hours.'
    : `Daylight GO window ${formatHourRange(goRun.start, goRun.end, timezone)}.`;
}

/**
 * The next 24 hours: wave height over verdict-coloured bands, wind as a
 * second line. Drag across it to read any hour.
 */
export function ConditionsChart(props: ChartProps) {
  const { spotId, hours, timezone } = props;
  const nativeSurf = props.mode === 'surf';
  const { track } = useAnalytics();
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

  const selectedIndex = Math.min(selected, hours.length - 1);
  const hour = hours[selectedIndex];
  if (hour === undefined) return null;
  const selectedWebHour = props.mode === undefined ? props.hours[selectedIndex] : undefined;
  const summary = props.mode === 'surf' ? undefined : webChartSummary(props.hours, timezone);
  const missingHours = nativeSurf
    ? hours.filter((slot) => slot.waveHeightM === undefined).length
    : 0;
  const marker = geometry.centres[selectedIndex] ?? 0;
  const selectedLabel = surfChartHourLabel(hour, timezone);

  const select = (x: number) => setSelected(hourIndexAt(x, hours.length, box));
  const startScrub = (event: GestureResponderEvent) => {
    originX.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
    select(event.nativeEvent.locationX);
  };
  const moveScrub = (event: GestureResponderEvent) => {
    select(event.nativeEvent.pageX - originX.current);
  };
  const endScrub = () => {
    if (props.mode === 'surf') {
      track('chart_scrubbed', { spot: spotId, hours_ahead: selectedIndex });
      return;
    }
    const event = chartScrubbed(spotId, props.hours, selected);
    if (event !== undefined) track('chart_scrubbed', event);
  };

  return (
    <YStack gap="$4">
      <Eyebrow>Next 24 hours</Eyebrow>
      {nativeSurf ? (
        <Text color="$color" fontFamily="$body" accessibilityLiveRegion="polite">
          {selectedLabel}
        </Text>
      ) : (
        <XStack gap="$4" alignItems="baseline" flexWrap="wrap" accessibilityLiveRegion="polite">
          <Text fontFamily="$display" fontSize="$4" fontWeight="600" color="$color">
            {`${formatDayName(hour.time, timezone)} ${formatHour(hour.time, timezone)}`}
          </Text>
          <Text fontFamily="$mono" fontSize="$4" color="$color">
            {`${hour.waveHeightM?.toFixed(1)}m · ${Math.round(hour.windSpeedKmh ?? 0)}km/h`}
          </Text>
          {selectedWebHour !== undefined ? (
            <Text
              fontFamily="$body"
              fontSize="$4"
              fontWeight="600"
              color={
                selectedWebHour.daylight && selectedWebHour.verdict === 'go'
                  ? '$accent'
                  : '$colorMuted'
              }
            >
              {webHourLabel(selectedWebHour)}
            </Text>
          ) : null}
        </XStack>
      )}
      {missingHours > 0 ? (
        <Text color="$colorMuted" fontFamily="$body">
          {missingHours === 24
            ? 'Hourly forecast unavailable.'
            : `Forecast unavailable for ${missingHours} of the next 24 hours.`}
        </Text>
      ) : null}
      <View
        testID="conditions-chart"
        accessible
        accessibilityRole={nativeSurf ? 'adjustable' : 'image'}
        accessibilityLabel={
          nativeSurf
            ? 'Wave height and wind forecast for the next 24 hours'
            : `Wave height and wind for the next 24 hours. Waves up to ${geometry.waveMaxM} metres. ${summary}`
        }
        accessibilityValue={nativeSurf ? { text: selectedLabel } : undefined}
        accessibilityActions={
          nativeSurf ? [{ name: 'increment' }, { name: 'decrement' }] : undefined
        }
        onAccessibilityAction={
          nativeSurf
            ? ({ nativeEvent }) => {
                const step = nativeEvent.actionName === 'increment' ? 1 : -1;
                setSelected((index) => Math.min(Math.max(index + step, 0), hours.length - 1));
              }
            : undefined
        }
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={startScrub}
        onResponderMove={moveScrub}
        onResponderRelease={endScrub}
        style={{ height: HEIGHT }}
      >
        {width > 0 ? (
          <Svg width={width} height={HEIGHT} pointerEvents="none">
            {geometry.bands.map((band, index) => {
              const legacyHour = props.mode === undefined ? props.hours[index] : undefined;
              if (band.daylight && legacyHour === undefined) return null;
              const fill =
                band.daylight && legacyHour !== undefined
                  ? BAND_COLOUR[legacyHour.verdict]
                  : colors.inkOnLight;
              return (
                <Rect
                  key={band.x}
                  x={band.x}
                  y={BOX_MARGINS.top}
                  width={Math.max(band.width - 1, 0)}
                  height={HEIGHT - BOX_MARGINS.top - BOX_MARGINS.bottom}
                  fill={fill}
                  opacity={0.35}
                />
              );
            })}
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
      {missingHours < 24 ? (
        <XStack gap="$6" flexWrap="wrap">
          <Text fontFamily="$body" fontSize="$2" color="$colorMuted">
            {`── waves (to ${geometry.waveMaxM}m)`}
          </Text>
          <Text fontFamily="$body" fontSize="$2" color="$colorMuted">
            {`- - wind (to ${geometry.windMaxKmh}km/h)`}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}
