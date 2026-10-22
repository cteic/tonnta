import { type ReactNode, useEffect, useMemo } from 'react';

import { usePathname } from 'expo-router';

import { PostHogErrorBoundary, PostHogProvider, usePostHog } from 'posthog-react-native';

import type { AnalyticsEvents } from './analytics-events';

/**
 * Product analytics and error tracking, through PostHog (US cloud).
 *
 * The project key is public by design: it can only send events into the
 * project, never read them, and it ships in every build regardless.
 *
 * Collected: screen views, app lifecycle events, uncaught exceptions,
 * unhandled promise rejections, render errors, and the named events below.
 * Not collected: session replay, touch autocapture, anything that identifies
 * a person. Development builds send nothing unless EXPO_PUBLIC_POSTHOG_DEV=1.
 */

const POSTHOG_KEY =
  process.env.EXPO_PUBLIC_POSTHOG_KEY ?? 'phc_Bhzsj5nJvFU7sx5rqucLbinZ4rrAg37uicC5vRQ37t27';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

const ENABLED = !__DEV__ || process.env.EXPO_PUBLIC_POSTHOG_DEV === '1';
const DEBUG = process.env.EXPO_PUBLIC_POSTHOG_DEBUG === '1';

/** Stable across renders, so `track` is safe in effect dependency lists. */
export function useAnalytics() {
  const posthog = usePostHog();
  return useMemo(
    () => ({
      track<Name extends keyof AnalyticsEvents>(
        name: Name,
        properties: AnalyticsEvents[Name]
      ): void {
        posthog.capture(name, properties);
      },
    }),
    [posthog]
  );
}

function ScreenTracker() {
  const pathname = usePathname();
  const posthog = usePostHog();
  useEffect(() => {
    posthog.screen(pathname);
  }, [pathname, posthog]);
  return null;
}

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  return (
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      autocapture={false}
      debug={DEBUG}
      options={{
        host: POSTHOG_HOST,
        disabled: !ENABLED,
        captureAppLifecycleEvents: true,
        enableSessionReplay: false,
        personProfiles: 'identified_only',
        errorTracking: {
          autocapture: { uncaughtExceptions: true, unhandledRejections: true, console: false },
        },
      }}
    >
      <ScreenTracker />
      <PostHogErrorBoundary>{children}</PostHogErrorBoundary>
    </PostHogProvider>
  );
}
