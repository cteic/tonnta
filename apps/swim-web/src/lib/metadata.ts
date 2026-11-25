import type { Metadata } from 'next';
import { headers } from 'next/headers';

import type { BathingWater } from '@tonnta/types';

import {
  SITE_DESCRIPTION,
  SITE_LABEL,
  SITE_NAME,
  beachPath,
  isProductionHost,
  robotsFor,
} from './site';

async function robots(): Promise<Metadata['robots']> {
  return robotsFor(isProductionHost((await headers()).get('host')));
}

export async function homeMetadata(): Promise<Metadata> {
  const title = `${SITE_NAME}: ${SITE_LABEL}`;
  return {
    robots: await robots(),
    title: { absolute: title },
    description: SITE_DESCRIPTION,
    alternates: { canonical: '/' },
    openGraph: {
      title,
      description: SITE_DESCRIPTION,
      siteName: SITE_NAME,
      url: '/',
      type: 'website',
    },
    twitter: { card: 'summary_large_image', title, description: SITE_DESCRIPTION },
  };
}

export async function beachMetadata(water: BathingWater): Promise<Metadata> {
  const title = `${water.name}, Co. ${water.county} · ${SITE_NAME}`;
  const description = `EPA facts for ${water.name}, Co. ${water.county}: alerts, water quality rating, lifeguard cover and the bathing season, with weather and sea model values.`;
  const url = beachPath(water.slug);
  return {
    robots: await robots(),
    title: { absolute: title },
    description,
    keywords: ['bathing water', water.name, water.county, 'Ireland', 'EPA', 'water quality'],
    alternates: { canonical: url },
    openGraph: { title, description, siteName: SITE_NAME, url, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  };
}
