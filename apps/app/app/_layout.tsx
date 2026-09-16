import { Platform } from 'react-native';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { TamaguiProvider, colors, tamaguiConfig } from '@tonnta/ui';

/**
 * Root layout: Tamagui provider over a headerless native stack. On web the
 * base CSS is emitted once by app/+html.tsx, so runtime injection is off.
 */
export default function RootLayout() {
  return (
    <TamaguiProvider
      config={tamaguiConfig}
      defaultTheme="dawn"
      disableInjectCSS={Platform.OS === 'web'}
    >
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.harbour },
        }}
      />
    </TamaguiProvider>
  );
}
