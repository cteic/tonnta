import { useState } from 'react';

import { Pressable } from 'react-native';

import { MAX_FORECAST_AGE_MS, firstLightLabel } from '@tonnta/data';
import type { Verdict } from '@tonnta/types';
import { Text, XStack, YStack } from '@tonnta/ui';

import type { SpotOutlook } from '@/lib/conditions';
import { formatDayName, formatHour } from '@/lib/format';
import {
  SURF_RATING_GUIDANCE,
  surfConditionsLine,
  surfDayDetail,
  surfForecastAt,
  surfHeadlineFacts,
  surfRating,
} from '@/lib/surf-forecast';
import type { SurfDayDetail } from '@/lib/surf-forecast';
import { useDaylightClock } from '@/lib/use-daylight-clock';

import { ConditionsChart } from './conditions-chart';
import { Body, Eyebrow } from './screen';

const RATING_SEA_TOKEN: Record<Verdict, string> = {
  go: '$seaClean',
  maybe: '$seaMarginal',
  flat: '$seaFlat',
  blown: '$seaBlown',
};

interface NativeSurfForecastProps {
  outlook: SpotOutlook;
  refreshFailed: boolean;
}

export function NativeSurfForecast({ outlook, refreshFailed }: NativeSurfForecastProps) {
  const { spot } = outlook;
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  useDaylightClock(spot, outlook.loadedAt + MAX_FORECAST_AGE_MS);
  const forecast = surfForecastAt(outlook.forecastHours, spot, outlook.loadedAt, Date.now());
  if (refreshFailed || forecast.status === 'stale') {
    return <Body>The surf forecast is out of date. Waiting for updated data.</Body>;
  }

  const { current, dark, sunrise, firstLight, hours, days } = forecast;
  const rating = current === undefined || dark ? undefined : surfRating(current, spot);
  const firstLightRating = firstLight === undefined ? undefined : surfRating(firstLight, spot);
  return (
    <>
      <YStack
        gap="$4"
        padding="$10"
        borderRadius="$6"
        backgroundColor={rating === undefined ? '$surfaceRaised' : RATING_SEA_TOKEN[rating.verdict]}
      >
        <Text
          accessibilityRole="header"
          testID="surf-forecast-heading"
          fontFamily="$body"
          fontSize="$3"
          fontWeight="600"
          letterSpacing={1}
          textTransform="uppercase"
          color="$colorMuted"
        >
          Surf forecast · now
        </Text>
        {rating === undefined ? null : (
          <YStack gap="$2" accessible accessibilityLabel={`${rating.headline}. ${rating.reason}`}>
            <Text
              testID="surf-rating"
              fontFamily="$display"
              fontSize="$7"
              fontWeight="700"
              letterSpacing={-1}
              color="$color"
            >
              {rating.quality}
            </Text>
            <Body>{rating.reason}</Body>
          </YStack>
        )}
        {dark ? (
          <Body>
            {sunrise === undefined
              ? 'It is dark. Sunrise time unavailable.'
              : `It is dark. Sunrise at ${formatHour(sunrise, spot.timezone)}.`}
          </Body>
        ) : null}
        {current === undefined ? (
          <Body>Forecast unavailable for the current hour.</Body>
        ) : (
          <XStack
            gap="$5"
            flexWrap="wrap"
            accessible
            accessibilityLabel={surfConditionsLine(current)}
          >
            {surfHeadlineFacts(current).map((fact) => (
              <YStack key={fact.label} gap="$1" minWidth={90}>
                <Eyebrow>{fact.label}</Eyebrow>
                <Text fontFamily="$display" fontSize="$6" fontWeight="600" color="$color">
                  {fact.value}
                </Text>
                {fact.detail === undefined ? null : (
                  <Text fontFamily="$body" fontSize="$4" fontWeight="600" color="$color">
                    {fact.detail}
                  </Text>
                )}
              </YStack>
            ))}
          </XStack>
        )}
        {dark ? (
          <YStack gap="$2">
            <Eyebrow>
              {firstLight === undefined
                ? 'First light'
                : `First light · ${firstLightLabel(firstLight.time, sunrise, spot.timezone)}`}
            </Eyebrow>
            <Body muted>
              {firstLightRating === undefined
                ? 'First-light forecast unavailable.'
                : `${firstLightRating.headline}. ${firstLightRating.reason}`}
            </Body>
          </YStack>
        ) : null}
        {rating === undefined && firstLightRating === undefined ? null : (
          <YStack testID="surf-rating-guidance">
            <Body>{SURF_RATING_GUIDANCE}</Body>
          </YStack>
        )}
        <Body muted>
          {`Regional wave and wind estimates from Open-Meteo. Checked at ${formatHour(new Date(outlook.loadedAt).toISOString(), spot.timezone)}.`}
        </Body>
      </YStack>
      <ConditionsChart mode="surf" spotId={spot.id} hours={hours} timezone={spot.timezone} />
      <YStack gap="$4">
        <Eyebrow>Seven days</Eyebrow>
        <Body muted>Highest available wave estimates</Body>
        <Body muted>Tap a day for its daylight hours.</Body>
        <XStack gap="$2" flexWrap="wrap">
          {days.map((day) => {
            const dayName = formatDayName(`${day.date}T12:00:00Z`, spot.timezone);
            const waves =
              day.maxWaveHeightM === undefined
                ? 'Unavailable'
                : `${day.maxWaveHeightM.toFixed(1)} m`;
            const selected = day.date === selectedDate;
            return (
              <Pressable
                key={day.date}
                style={{ flexGrow: 1, flexBasis: 80 }}
                accessibilityRole="button"
                accessibilityLabel={`${dayName}, highest waves ${waves}`}
                accessibilityHint={selected ? 'Hides this day' : 'Shows this day hour by hour'}
                accessibilityState={{
                  expanded: selected,
                  disabled: day.maxWaveHeightM === undefined,
                }}
                disabled={day.maxWaveHeightM === undefined}
                testID={`surf-day-${day.date}`}
                onPress={() => {
                  setSelectedDate(selected ? undefined : day.date);
                }}
              >
                <YStack
                  alignItems="center"
                  gap="$2"
                  paddingVertical="$5"
                  borderRadius="$3"
                  borderWidth={2}
                  borderColor={selected ? '$accent' : 'transparent'}
                  backgroundColor="$surfaceRaised"
                >
                  <Text fontFamily="$body" fontSize="$2" fontWeight="600" color="$color">
                    {dayName}
                  </Text>
                  <Text fontFamily="$display" fontSize="$3" fontWeight="600" color="$color">
                    {waves}
                  </Text>
                </YStack>
              </Pressable>
            );
          })}
        </XStack>
        {selectedDate === undefined ? null : (
          <SurfDayPanel
            detail={surfDayDetail(outlook.forecastHours, spot, selectedDate, Date.now())}
            timezone={spot.timezone}
          />
        )}
      </YStack>
    </>
  );
}

interface SurfDayPanelProps {
  detail: SurfDayDetail;
  timezone: string;
}

function SurfDayPanel({ detail, timezone }: SurfDayPanelProps) {
  const sun = [
    detail.sunrise === undefined ? undefined : `Sunrise ${formatHour(detail.sunrise, timezone)}`,
    detail.sunset === undefined ? undefined : `sunset ${formatHour(detail.sunset, timezone)}`,
  ]
    .filter((part) => part !== undefined)
    .join(' · ');
  return (
    <YStack
      testID="surf-day-detail"
      gap="$3"
      padding="$6"
      borderRadius="$4"
      backgroundColor="$surfaceRaised"
    >
      <Text
        accessibilityRole="header"
        fontFamily="$display"
        fontSize="$4"
        fontWeight="600"
        color="$color"
      >
        {formatDayName(`${detail.date}T12:00:00Z`, timezone)}
      </Text>
      {sun === '' ? null : <Body muted>{sun}</Body>}
      {detail.hours.length === 0 ? (
        <Body>No forecast for the full daylight hours left on this day.</Body>
      ) : (
        detail.hours.map((hour) => (
          <YStack
            key={hour.time}
            gap="$1"
            accessible
            accessibilityLabel={`${formatHour(hour.time, timezone)}. ${hour.seaState === undefined ? '' : `${hour.seaState}. `}${hour.facts}`}
          >
            <XStack gap="$3" alignItems="baseline">
              <Text fontFamily="$body" fontSize="$4" fontWeight="600" color="$color">
                {formatHour(hour.time, timezone)}
              </Text>
              {hour.seaState === undefined ? null : (
                <Text fontFamily="$body" fontSize="$3" fontWeight="600" color="$accent">
                  {hour.seaState}
                </Text>
              )}
            </XStack>
            <Body muted>{hour.facts}</Body>
          </YStack>
        ))
      )}
      <Body muted>Only full daylight hours are listed.</Body>
    </YStack>
  );
}
