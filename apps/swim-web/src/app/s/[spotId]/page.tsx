import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

import { bathingWaterSlugForSpot, getBathingWater } from '@tonnta/data';

import { BeachFactsView } from '@/components/beach-facts-view';
import { PageFrame } from '@/components/page-frame';
import { beachFactRows, irishTime } from '@/lib/beach-fact-rows';
import { loadBeachFacts } from '@/lib/beach-facts';
import { beachMetadata } from '@/lib/metadata';
import { beachPath } from '@/lib/site';

export const dynamic = 'force-dynamic';

interface BeachPageProps {
  params: Promise<{ spotId: string }>;
}

export async function generateMetadata({ params }: BeachPageProps): Promise<Metadata> {
  const water = getBathingWater((await params).spotId);
  return water === undefined ? {} : beachMetadata(water);
}

export default async function BeachPage({ params }: BeachPageProps) {
  const { spotId } = await params;
  const water = getBathingWater(spotId);
  if (water === undefined) {
    // Old swim links used spot ids, for example /s/donabate.
    const slug = bathingWaterSlugForSpot(spotId);
    if (slug !== undefined) permanentRedirect(beachPath(slug));
    notFound();
  }
  const facts = await loadBeachFacts(water);
  const place = `${water.localAuthority}, Co. ${water.county}`;
  return (
    <PageFrame context={`Co. ${water.county}`}>
      <BeachFactsView
        name={water.name}
        place={place}
        rows={beachFactRows(facts)}
        checkedAt={irishTime(facts.checkedAt)}
        profileUrl={facts.status.ok ? facts.status.value.profileUrl : undefined}
      />
    </PageFrame>
  );
}
