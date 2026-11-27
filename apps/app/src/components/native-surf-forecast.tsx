import { MAX_FORECAST_AGE_MS } from '@tonnta/data';
import { Text, XStack, YStack } from '@tonnta/ui';

import type { SpotOutlook } from '@/lib/conditions';
import { formatDayName } from '@/lib/format';
import { surfForecastAt } from '@/lib/surf-forecast';
import { useDaylightClock } from '@/lib/use-daylight-clock';

import { ConditionsChart } from './conditions-chart';
import { Body, Eyebrow } from './screen';
import { SeaHeadline } from './sea-headline';

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
      <SeaHeadline
        spot={spot}
        current={current}
        dark={dark}
        sunrise={sunrise}
        firstLight={firstLight}
        loadedAt={outlook.loadedAt}
      />
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
