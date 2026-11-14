import type { Metadata, Viewport } from 'next';

import { JsonLd, ShellRoot } from '@tonnta/web-shell';
import '@tonnta/web-shell/globals.css';

import { SITE_DESCRIPTION, SITE_LABEL, SITE_NAME, SITE_URL } from '@/lib/site';

import '../../public/tamagui.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_LABEL}`, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: 'website', locale: 'en_IE', siteName: SITE_NAME },
};

export const viewport: Viewport = {
  themeColor: '#0C1B22',
  width: 'device-width',
  initialScale: 1,
};

const SITE_GRAPH = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: 'en-IE',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ShellRoot before={<JsonLd data={SITE_GRAPH} />}>{children}</ShellRoot>;
}
