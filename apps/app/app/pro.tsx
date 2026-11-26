import { Platform } from 'react-native';

import { Redirect } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function ProScreen() {
  // Not part of native v1; a deep link lands on the surf facts instead.
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  return (
    <PlaceholderScreen
      eyebrow="Tonnta Pro"
      title="Get pinged when it's on"
      description="Alerts when the waves and wind line up, hourly detail and more spots — one small yearly fee."
    />
  );
}
