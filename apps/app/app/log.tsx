import { Platform } from 'react-native';

import { Redirect } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function LogScreen() {
  // Not part of native v1; a deep link lands on the surf facts instead.
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  return (
    <PlaceholderScreen
      eyebrow="Dialann · diary"
      title="Loga"
      description="Your session diary — what you rode, what the sea was doing, and how it went."
    />
  );
}
