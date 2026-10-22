import { useEffect, useState } from 'react';

import { Pressable } from 'react-native';

import { Link } from 'expo-router';

import { DEFAULT_SPOT_ID } from '@tonnta/data';
import { Text, XStack, YStack } from '@tonnta/ui';

import { LiveTideCard } from '@/components/live-tide-card';
import { OutlookView } from '@/components/outlook-view';
import { Body, Eyebrow, Screen } from '@/components/screen';
import { useAnalytics } from '@/lib/analytics';
import { outlookViewed } from '@/lib/analytics-events';
import type { OutlookState } from '@/lib/use-spot-outlook';
import { useSpotOutlook } from '@/lib/use-spot-outlook';

const NAV_LINKS: { href: '/log' | '/pro' | '/s/donabate'; label: string }[] = [
  { href: '/log', label: 'Loga' },
  { href: '/pro', label: 'Pro' },
  { href: '/s/donabate', label: 'Spot' },
];

type Mode = 'surf' | 'swim';

const MODES: { mode: Mode; label: string }[] = [
  { mode: 'surf', label: 'Tonn · surf' },
  { mode: 'swim', label: 'Snámh · swim' },
];

interface ModeToggleProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <XStack
      alignSelf="flex-start"
      padding="$1"
      borderRadius="$7"
      backgroundColor="$surfaceRaised"
      accessibilityRole="tablist"
    >
      {MODES.map((option) => {
        const selected = option.mode === mode;
        return (
          <Pressable
            key={option.mode}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            testID={`mode-${option.mode}`}
            onPress={() => onChange(option.mode)}
          >
            <XStack
              paddingHorizontal="$6"
              paddingVertical="$3"
              borderRadius="$7"
              backgroundColor={selected ? '$accent' : 'transparent'}
            >
              <Text
                fontFamily="$body"
                fontSize="$3"
                fontWeight="600"
                color={selected ? '$background' : '$color'}
              >
                {option.label}
              </Text>
            </XStack>
          </Pressable>
        );
      })}
    </XStack>
  );
}

interface OutlookBodyProps {
  state: OutlookState;
  mode: Mode;
}

function OutlookBody({ state, mode }: OutlookBodyProps) {
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
  return <OutlookView outlook={state.outlook} mode={mode} />;
}

export default function HomeScreen() {
  const state = useSpotOutlook(DEFAULT_SPOT_ID);
  const [mode, setMode] = useState<Mode>('surf');
  const { track } = useAnalytics();
  const outlook = state.status === 'ready' ? state.outlook : undefined;

  useEffect(() => {
    if (outlook === undefined) return;
    track('outlook_viewed', outlookViewed(outlook));
  }, [outlook, track]);

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

      <ModeToggle mode={mode} onChange={setMode} />
      <OutlookBody state={state} mode={mode} />
      <LiveTideCard spotId={DEFAULT_SPOT_ID} />
    </Screen>
  );
}
