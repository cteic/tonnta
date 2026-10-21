import type { DailySummary, HourlyConditions, Verdict, VerdictResult } from '@tonnta/types';
import { Text, XStack, YStack } from '@tonnta/ui';

import type { SpotOutlook } from '@/lib/conditions';
import {
  BOARD_LABEL,
  VERDICT_LABEL,
  WIND_STATE_LABEL,
  formatDayName,
  formatHour,
} from '@/lib/format';

import { Body, Eyebrow, Heading } from './screen';

const VERDICT_SEA_TOKEN: Record<Verdict, string> = {
  go: '$seaClean',
  maybe: '$seaMarginal',
  flat: '$seaFlat',
  blown: '$seaBlown',
};

function conditionsLine(hour: HourlyConditions): string {
  const wind = `${WIND_STATE_LABEL[hour.windState]} ${Math.round(hour.windSpeedKmh)}km/h`;
  return `${hour.waveHeightM.toFixed(1)}m @ ${Math.round(hour.wavePeriodS)}s · ${wind}`;
}

interface VerdictHeroProps {
  verdict: VerdictResult;
  hour: HourlyConditions | undefined;
}

function VerdictHero({ verdict, hour }: VerdictHeroProps) {
  const label = VERDICT_LABEL[verdict.verdict];
  const verdictColor = verdict.verdict === 'go' ? '$accent' : '$color';
  return (
    <YStack
      gap="$4"
      padding="$10"
      borderRadius="$6"
      backgroundColor={VERDICT_SEA_TOKEN[verdict.verdict]}
    >
      <Eyebrow>{label.irish}</Eyebrow>
      <Text
        accessibilityRole="header"
        testID="verdict-heading"
        fontFamily="$display"
        fontSize="$7"
        lineHeight="$7"
        fontWeight="700"
        letterSpacing={-1.5}
        color={verdictColor}
      >
        {label.english}
      </Text>
      {hour !== undefined ? (
        <Text fontFamily="$mono" fontSize="$5" lineHeight="$5" color="$color">
          {conditionsLine(hour)}
        </Text>
      ) : null}
      <Body>{verdict.reason}</Body>
      {verdict.board !== undefined ? (
        <XStack
          alignSelf="flex-start"
          paddingHorizontal="$7"
          paddingVertical="$3"
          borderRadius="$7"
          backgroundColor="$surfaceRaised"
        >
          <Text fontFamily="$display" fontSize="$1" fontWeight="600" color="$color">
            {`${BOARD_LABEL[verdict.board]} day`}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}

interface DayCellProps {
  day: DailySummary;
  timezone: string;
}

function DayCell({ day, timezone }: DayCellProps) {
  return (
    <YStack
      flex={1}
      minWidth={64}
      alignItems="center"
      gap="$2"
      paddingVertical="$5"
      borderRadius="$3"
      backgroundColor={VERDICT_SEA_TOKEN[day.verdict]}
    >
      <Text fontFamily="$body" fontSize="$2" fontWeight="600" color="$color">
        {formatDayName(`${day.date}T12:00:00`, timezone)}
      </Text>
      <Text fontFamily="$display" fontSize="$3" fontWeight="600" color="$color">
        {`${day.maxWaveHeightM.toFixed(1)}m`}
      </Text>
      <Text fontFamily="$body" fontSize="$1" color="$colorMuted">
        {VERDICT_LABEL[day.verdict].english}
      </Text>
    </YStack>
  );
}

interface OutlookViewProps {
  outlook: SpotOutlook;
}

export function OutlookView({ outlook }: OutlookViewProps) {
  const { spot, now, currentHour, nextWindow, days } = outlook;
  return (
    <>
      <VerdictHero verdict={now} hour={currentHour} />
      <YStack gap="$4">
        <Eyebrow>Next good window</Eyebrow>
        {nextWindow !== undefined ? (
          <Heading>
            {`${formatDayName(nextWindow.start, spot.timezone)} ${formatHour(nextWindow.start, spot.timezone)}–${formatHour(nextWindow.end, spot.timezone)}`}
          </Heading>
        ) : (
          <Body muted>Nothing rideable in the next seven days.</Body>
        )}
      </YStack>
      <YStack gap="$4">
        <Eyebrow>Seven days</Eyebrow>
        <XStack gap="$2" flexWrap="wrap">
          {days.slice(0, 7).map((day) => (
            <DayCell key={day.date} day={day} timezone={spot.timezone} />
          ))}
        </XStack>
      </YStack>
    </>
  );
}
