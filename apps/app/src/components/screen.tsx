import type { ReactNode } from 'react';

import { SafeAreaView } from 'react-native-safe-area-context';

import { ScrollView, Text, YStack } from '@tonnta/ui';

interface ScreenProps {
  children: ReactNode;
}

/** Single-column page shell: safe area, themed background, 720px max width on wide screens. */
export function Screen({ children }: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView flex={1} backgroundColor="$background" contentContainerStyle={{ flexGrow: 1 }}>
        <YStack width="100%" maxWidth={720} alignSelf="center" padding="$10" gap="$10">
          {children}
        </YStack>
      </ScrollView>
    </SafeAreaView>
  );
}

interface EyebrowProps {
  children: string;
}

/** Small uppercase label above a heading — the Irish layer lives here. */
export function Eyebrow({ children }: EyebrowProps) {
  return (
    <Text
      fontFamily="$body"
      fontSize="$2"
      fontWeight="600"
      letterSpacing={1.2}
      textTransform="uppercase"
      color="$colorMuted"
    >
      {children}
    </Text>
  );
}

interface HeadingProps {
  children: string;
}

export function Heading({ children }: HeadingProps) {
  return (
    <Text
      accessibilityRole="header"
      fontFamily="$display"
      fontSize="$7"
      lineHeight="$7"
      fontWeight="600"
      letterSpacing={-1}
      color="$color"
    >
      {children}
    </Text>
  );
}

interface BodyProps {
  children: string;
  muted?: boolean;
}

export function Body({ children, muted = false }: BodyProps) {
  return (
    <Text fontFamily="$body" fontSize="$5" lineHeight="$5" color={muted ? '$colorMuted' : '$color'}>
      {children}
    </Text>
  );
}
