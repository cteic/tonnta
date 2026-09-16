import { Link } from 'expo-router';

import { DEFAULT_SPOT_ID } from '@tonnta/data';
import { Text, XStack, YStack } from '@tonnta/ui';

import { OutlookView } from '@/components/outlook-view';
import { Body, Eyebrow, Screen } from '@/components/screen';
import type { OutlookState } from '@/lib/use-spot-outlook';
import { useSpotOutlook } from '@/lib/use-spot-outlook';

const NAV_LINKS: { href: '/log' | '/pro' | '/s/donabate'; label: string }[] = [
  { href: '/log', label: 'Loga' },
  { href: '/pro', label: 'Pro' },
  { href: '/s/donabate', label: 'Spot' },
];

interface OutlookBodyProps {
  state: OutlookState;
}

function OutlookBody({ state }: OutlookBodyProps) {
  if (state.status === 'loading') {
    return <Body muted>Reading the sea…</Body>;
  }
  if (state.status === 'error') {
    return (
      <YStack gap="$3">
        <Body>The wave forecast is unavailable right now.</Body>
        <Body muted>{state.message}</Body>
      </YStack>
    );
  }
  return <OutlookView outlook={state.outlook} />;
}

export default function HomeScreen() {
  const state = useSpotOutlook(DEFAULT_SPOT_ID);

  return (
    <Screen>
      <XStack justifyContent="space-between" alignItems="flex-end" flexWrap="wrap" gap="$5">
        <YStack gap="$1">
          <Text
            fontFamily="$display"
            fontSize="$3"
            fontWeight="600"
            letterSpacing={-0.5}
            color="$color"
          >
            Tonnta
          </Text>
          <Eyebrow>Domhnach Bat · Donabate</Eyebrow>
        </YStack>
        <XStack gap="$7">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              <Text fontFamily="$body" fontSize="$4" fontWeight="600" color="$accent">
                {link.label}
              </Text>
            </Link>
          ))}
        </XStack>
      </XStack>

      <OutlookBody state={state} />
    </Screen>
  );
}
