import type { Metadata } from 'next';

import { bathingWatersByCounty } from '@tonnta/data';

import { BeachList } from '@/components/beach-list';
import { PageFrame } from '@/components/page-frame';
import { homeMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return homeMetadata();
}

export default function HomePage() {
  return (
    <PageFrame>
      <BeachList groups={bathingWatersByCounty()} />
    </PageFrame>
  );
}
