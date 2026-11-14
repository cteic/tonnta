import type { ReactNode } from 'react';

import { TamaguiClientProvider } from './tamagui-provider';
import { ThemeProvider } from './themes/theme-context';

/** Fonts the first paint needs. The files live in each site's `public/fonts`. */
export const PRELOADED_FONTS = [
  '/fonts/ClashDisplay-Semibold.woff2',
  '/fonts/GeneralSans-Regular.woff2',
] as const;

interface ShellRootProps {
  children: ReactNode;
  /** Rendered first in <body>, outside the client providers: JSON-LD and similar. */
  before?: ReactNode;
}

/** The root document every Tonnta site renders from its `app/layout.tsx`. */
export function ShellRoot({ children, before }: ShellRootProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {PRELOADED_FONTS.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body>
        {before}
        <TamaguiClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </TamaguiClientProvider>
      </body>
    </html>
  );
}
