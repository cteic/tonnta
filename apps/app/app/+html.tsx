import type { PropsWithChildren } from 'react';

import { ScrollViewStyleReset } from 'expo-router/html';

import { colors, tamaguiConfig } from '@tonnta/ui';

const BASE_STYLES = `
html, body, #root { height: 100%; }
body { margin: 0; background: ${colors.harbour}; color: ${colors.fog}; overflow-y: auto; }
`;

/**
 * Root HTML for every web page (static output). Tamagui's base CSS goes in
 * here so the pre-rendered page is themed on first paint.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Tonnta — surf conditions for Donabate</title>
        <meta
          name="description"
          content="Live surf conditions, verdict and board call for Donabate — waves, wind, tides and alerts."
        />
        <meta name="theme-color" content={colors.harbour} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: BASE_STYLES }} />
        <style
          dangerouslySetInnerHTML={{ __html: tamaguiConfig.getCSS({ exclude: 'design-system' }) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
