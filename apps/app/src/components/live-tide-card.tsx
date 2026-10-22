import { useEffect, useRef, useState } from 'react';

import { AccessibilityInfo, Animated } from 'react-native';

import { getSpot } from '@tonnta/data';
import type { TideTrend } from '@tonnta/types';
import { Text, XStack, YStack } from '@tonnta/ui';

import { formatHour } from '@/lib/format';
import { formatLevel, formatSince } from '@/live/live-tide';
import type { LiveStatus } from '@/live/use-live-tide';
import { useLiveTide } from '@/live/use-live-tide';
import { useNow } from '@/live/use-now';

import { Body, Eyebrow } from './screen';

const TREND_LABEL: Record<TideTrend, string> = {
  rising: 'Rising ↑',
  falling: 'Falling ↓',
  slack: 'Slack',
};

const STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
};

const SPARK_HEIGHT = 44;

const PULSE_MS = 900;

interface StatusDotProps {
  live: boolean;
}

/** Pulses while the stream is live, unless the device asks for reduced motion. */
function StatusDot({ live }: StatusDotProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!live || reduceMotion) {
      opacity.setValue(1);
      return undefined;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: PULSE_MS, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [live, reduceMotion, opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <YStack
        width={8}
        height={8}
        borderRadius={4}
        backgroundColor={live ? '$accent' : '$colorMuted'}
      />
    </Animated.View>
  );
}

function statusLine(status: LiveStatus, lastActivityAt: number | undefined, now: number): string {
  if (status !== 'live' || lastActivityAt === undefined) return STATUS_LABEL[status];
  return `${STATUS_LABEL.live} · ${formatSince(now - lastActivityAt)}`;
}

interface LiveTideCardProps {
  spotId: string;
}

/** The spot's tide gauge, streamed: current level, trend and the last hour as a sparkline. */
export function LiveTideCard({ spotId }: LiveTideCardProps) {
  const spot = getSpot(spotId);
  const { state, status, lastActivityAt } = useLiveTide(spotId);
  const now = useNow(1000, status === 'live');
  if (spot?.tideGaugeId === undefined) return null;

  const latest = state.readings.at(-1);
  const levels = state.readings.map((reading) => reading.levelM);
  const min = Math.min(...levels);
  const range = Math.max(...levels) - min || 1;

  return (
    <YStack
      gap="$4"
      padding="$10"
      borderRadius="$6"
      backgroundColor="$surfaceRaised"
      testID="live-tide"
    >
      <YStack gap="$2">
        <Eyebrow>{`Tide · ${spot.tideGaugeId} gauge`}</Eyebrow>
        <XStack
          alignItems="center"
          gap="$2"
          accessibilityRole="text"
          accessibilityLabel={`Tide stream ${STATUS_LABEL[status].replace('…', '').toLowerCase()}`}
          accessibilityLiveRegion="polite"
          testID="live-status"
        >
          <StatusDot live={status === 'live'} />
          <Text fontFamily="$body" fontSize="$2" fontWeight="600" color="$colorMuted">
            {statusLine(status, lastActivityAt, now)}
          </Text>
        </XStack>
      </YStack>

      {latest === undefined ? (
        <Body muted>Waiting for the gauge…</Body>
      ) : (
        <>
          <XStack alignItems="flex-end" gap="$5" flexWrap="wrap">
            <Text
              fontFamily="$display"
              fontSize="$7"
              lineHeight="$7"
              fontWeight="700"
              letterSpacing={-1}
              color="$color"
            >
              {formatLevel(latest.levelM)}
            </Text>
            {state.trend !== null ? (
              <Text fontFamily="$body" fontSize="$5" fontWeight="600" color="$accent">
                {TREND_LABEL[state.trend]}
              </Text>
            ) : null}
          </XStack>
          <Body muted>Above mean sea level (OD Malin).</Body>
          <XStack height={SPARK_HEIGHT} alignItems="flex-end" gap={3} accessibilityElementsHidden>
            {state.readings.map((reading, index) => (
              <YStack
                key={reading.time}
                flex={1}
                height={Math.max(3, ((reading.levelM - min) / range) * SPARK_HEIGHT)}
                borderRadius={2}
                backgroundColor={index === state.readings.length - 1 ? '$accent' : '$colorMuted'}
                opacity={index === state.readings.length - 1 ? 1 : 0.5}
              />
            ))}
          </XStack>
          <Text fontFamily="$body" fontSize="$2" color="$colorMuted">
            {`Reading at ${formatHour(latest.time, spot.timezone)} · the gauge reports every 5 minutes`}
          </Text>
        </>
      )}
    </YStack>
  );
}
