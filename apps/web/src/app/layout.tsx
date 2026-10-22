import type { Metadata, Viewport } from 'next';

import { JsonLd } from '@/components/json-ld';
import { TamaguiClientProvider } from '@/components/tamagui-provider';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';
import { buildSiteGraph } from '@/lib/structured-data';
import { ThemeProvider } from '@/themes/theme-context';

import '../../public/tamagui.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — surf conditions for Donabate`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ['surf', 'Donabate', 'Ireland', 'waves', 'forecast', 'SUP', 'longboard'],
  alternates: { canonical: '/' },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    type: 'website',
    locale: 'en_IE',
    url: '/',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: '#0C1B22',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="/fonts/ClashDisplay-Semibold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/GeneralSans-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <JsonLd data={buildSiteGraph()} />
        <TamaguiClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </TamaguiClientProvider>
      </body>
    </html>
  );
}
