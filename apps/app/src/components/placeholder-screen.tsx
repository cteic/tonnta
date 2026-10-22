import { Link } from 'expo-router';

import { Text, YStack } from '@tonnta/ui';

import { Body, Eyebrow, Heading, Screen } from './screen';

interface PlaceholderScreenProps {
  eyebrow: string;
  title: string;
  description: string;
}

/** A route that exists but whose full screen lands in a later release. */
export function PlaceholderScreen({ eyebrow, title, description }: PlaceholderScreenProps) {
  return (
    <Screen>
      <YStack gap="$4">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading>{title}</Heading>
        <Body muted>{description}</Body>
      </YStack>
      <Link href="/">
        <Text fontFamily="$body" fontSize="$4" fontWeight="600" color="$accent">
          ← Back to the verdict
        </Text>
      </Link>
    </Screen>
  );
}
