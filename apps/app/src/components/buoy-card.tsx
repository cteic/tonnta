import { getSpot } from '@tonnta/data';
import type { BuoyObservation } from '@tonnta/types';
import { Text, XStack, YStack } from '@tonnta/ui';

import { buoyFacts } from '@/lib/buoy-facts';
import { formatHour } from '@/lib/format';
import type { BuoyState } from '@/lib/use-buoy';
import { useBuoy } from '@/lib/use-buoy';
import { useNow } from '@/live/use-now';

import { Body, Eyebrow } from './screen';

function latestObservation(state: BuoyState): BuoyObservation | undefined {
  if (state.status === 'ready') return state.observation;
  if (state.status === 'error') return state.previous;
  return undefined;
}

interface BuoyCardProps {
  spotId: string;
}

export function BuoyCard({ spotId }: BuoyCardProps) {
  const spot = getSpot(spotId);
  const stationId = spot?.buoyStationId;
  const state = useBuoy(stationId);
  const now = useNow(60_000, true);
  const timezone = spot?.timezone ?? 'Europe/Dublin';

  const observation = latestObservation(state);
  const facts = buoyFacts(observation, now);

  let body;
  if (state.status === 'loading') {
    body = <Body muted>Reading the buoy…</Body>;
  } else if (facts.status === 'missing') {
    body = (
      <Body>
        {state.status === 'error'
          ? 'Buoy readings are unavailable right now.'
          : 'The buoy has not reported in the last two days.'}
      </Body>
    );
  } else {
    body = (
      <YStack gap="$3">
        <XStack gap="$2" flexWrap="wrap">
          {facts.facts.map((fact) => (
            <YStack
              key={fact.label}
              flex={1}
              minWidth={120}
              gap="$1"
              accessible
              accessibilityLabel={`${fact.label}: ${fact.value}`}
            >
              <Eyebrow>{fact.label}</Eyebrow>
              <Text fontFamily="$display" fontSize="$4" fontWeight="600" color="$color">
                {fact.value}
              </Text>
            </YStack>
          ))}
        </XStack>
        <Body muted>
          {[
            `Observed at ${formatHour(facts.observedAt, timezone)} (${facts.age}).`,
            facts.stale ? 'This reading is old and may not match the sea now.' : '',
            state.status === 'error' ? 'Refresh failed; showing the last reading.' : '',
          ]
            .filter((part) => part !== '')
            .join(' ')}
        </Body>
      </YStack>
    );
  }

  return (
    <YStack gap="$4" padding="$10" borderRadius="$6" backgroundColor="$surfaceRaised">
      <Text
        accessibilityRole="header"
        testID="buoy-heading"
        fontFamily="$display"
        fontSize="$5"
        fontWeight="600"
        color="$color"
      >
        {`Offshore buoy${stationId === undefined ? '' : ` ${stationId}`}`}
      </Text>
      {body}
      <Body muted>Data: Marine Institute weather buoy network, out in the Irish Sea.</Body>
    </YStack>
  );
}
