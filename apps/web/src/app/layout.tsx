import type { Metadata, Viewport } from 'next';

import { JsonLd, ShellRoot } from '@tonnta/web-shell';
import '@tonnta/web-shell/globals.css';

import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from '@/lib/site';
import { buildSiteGraph } from '@/lib/structured-data';

import '../../public/tamagui.css';

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
  return <ShellRoot before={<JsonLd data={buildSiteGraph()} />}>{children}</ShellRoot>;
}
