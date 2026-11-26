import { MAX_FORECAST_AGE_MS } from '@tonnta/data';
import { Text, XStack, YStack } from '@tonnta/ui';

import type { SpotOutlook } from '@/lib/conditions';
import { formatDayName, formatHour } from '@/lib/format';
import { surfConditionsLine, surfForecastAt, surfHeadlineFacts } from '@/lib/surf-forecast';
import { useDaylightClock } from '@/lib/use-daylight-clock';

import { ConditionsChart } from './conditions-chart';
import { Body, Eyebrow } from './screen';

interface NativeSurfForecastProps {
  outlook: SpotOutlook;
  refreshFailed: boolean;
}

export function NativeSurfForecast({ outlook, refreshFailed }: NativeSurfForecastProps) {
  const { spot } = outlook;
  useDaylightClock(spot, outlook.loadedAt + MAX_FORECAST_AGE_MS);
  const forecast = surfForecastAt(outlook.forecastHours, spot, outlook.loadedAt, Date.now());
  if (refreshFailed || forecast.status === 'stale') {
    return <Body>The surf forecast is out of date. Waiting for updated data.</Body>;
  }

  const { current, dark, sunrise, firstLight, hours, days } = forecast;
  return (
    <>
      <YStack gap="$4" padding="$10" borderRadius="$6" backgroundColor="$surfaceRaised">
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
              </YStack>
            ))}
          </XStack>
        )}
        {dark ? (
          <YStack gap="$2">
            <Eyebrow>
              {firstLight === undefined
                ? 'First light'
                : `First light · ${formatHour(firstLight.time, spot.timezone)}`}
            </Eyebrow>
            <Body muted>
              {firstLight === undefined
                ? 'First-light forecast unavailable.'
                : surfConditionsLine(firstLight)}
            </Body>
          </YStack>
        ) : null}
        <Body muted>
          {`Regional wave and wind estimates from Open-Meteo. Checked at ${formatHour(new Date(outlook.loadedAt).toISOString(), spot.timezone)}.`}
        </Body>
      </YStack>
      <ConditionsChart mode="surf" spotId={spot.id} hours={hours} timezone={spot.timezone} />
      <YStack gap="$4">
        <Eyebrow>Seven days</Eyebrow>
        <Body muted>Highest available wave estimates</Body>
        <XStack gap="$2" flexWrap="wrap">
          {days.map((day) => (
            <YStack
              key={day.date}
              flex={1}
              minWidth={80}
              alignItems="center"
              gap="$2"
              paddingVertical="$5"
              borderRadius="$3"
              backgroundColor="$surfaceRaised"
            >
              <Text fontFamily="$body" fontSize="$2" fontWeight="600" color="$color">
                {formatDayName(`${day.date}T12:00:00Z`, spot.timezone)}
              </Text>
              <Text fontFamily="$display" fontSize="$3" fontWeight="600" color="$color">
                {day.maxWaveHeightM === undefined
                  ? 'Unavailable'
                  : `${day.maxWaveHeightM.toFixed(1)} m`}
              </Text>
            </YStack>
          ))}
        </XStack>
      </YStack>
    </>
  );
}
