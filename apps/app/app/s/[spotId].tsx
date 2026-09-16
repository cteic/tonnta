import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';
import { resolveSpotRoute } from '@/lib/spot-param';

export default function SpotScreen() {
  const params = useLocalSearchParams();
  const { spotId, spot } = resolveSpotRoute(params.spotId);

  if (spot === undefined) {
    return (
      <PlaceholderScreen
        eyebrow="Spota · spot"
        title="Unknown spot"
        description={
          spotId === undefined
            ? 'No spot was named in the address.'
            : `No spot called "${spotId}" yet — Donabate is the only one so far.`
        }
      />
    );
  }

  return (
    <PlaceholderScreen
      eyebrow={spot.irishName !== undefined ? `${spot.irishName} · ${spot.region}` : spot.region}
      title={spot.name}
      description={`Faces ${spot.facing}° — the full spot screen with tides, buoy and hourly detail lands next.`}
    />
  );
}
