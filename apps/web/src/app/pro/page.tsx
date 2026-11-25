import type { Metadata } from 'next';

import { indexingMetadata } from '@/lib/page-metadata';

import { ProClient } from './pro-client';

const BASE_METADATA: Metadata = {
  title: 'Tonnta Pro',
  description:
    'The daily check stays free forever. Pro is the alerts — €14.90 a year, and a founder lifetime deal for the first hundred.',
  alternates: { canonical: '/pro' },
};

export async function generateMetadata(): Promise<Metadata> {
  return { ...BASE_METADATA, ...(await indexingMetadata()) };
}

export default function ProPage() {
  return <ProClient />;
}
