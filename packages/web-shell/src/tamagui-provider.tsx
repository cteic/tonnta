'use client';

import type { ReactNode } from 'react';
import { useRef } from 'react';

import { useServerInsertedHTML } from 'next/navigation';

import { TamaguiProvider, Theme } from 'tamagui';

import { config } from '@tonnta/ui/tamagui.config';

interface TamaguiClientProviderProps {
  children: ReactNode;
}

/**
 * Wraps the app in Tamagui's provider and injects the SSR CSS into <head>
 * during the server pass, so the first paint is fully themed.
 *
 * The insertion MUST happen exactly once: `useServerInsertedHTML` runs on
 * every streaming flush, and a repeated <style> tag can be spliced into the
 * middle of an in-flight RSC script chunk, corrupting the payload and
 * killing hydration (the intermittent "Application error" in production).
 */
export function TamaguiClientProvider({ children }: TamaguiClientProviderProps) {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) {
      return null;
    }
    inserted.current = true;
    return (
      <style
        key="tamagui-ssr"
        dangerouslySetInnerHTML={{
          __html: config.getCSS({ exclude: 'design-system' }),
        }}
      />
    );
  });

  return (
    <TamaguiProvider config={config} defaultTheme="dawn" disableInjectCSS>
      <Theme name="dawn">{children}</Theme>
    </TamaguiProvider>
  );
}
