'use client';

import { useRouter } from 'next/navigation';

import { SpotMenu } from '@tonnta/web-shell';

import { spotPath } from '@/lib/spot-links';

/** Donabate lives at `/`; every other spot at `/s/<id>`. */
export function SpotSwitcher({ activeSpotId }: { activeSpotId: string }) {
  const router = useRouter();
  return (
    <SpotMenu
      activeSpotId={activeSpotId}
      onSelect={(spotId) => {
        router.push(spotPath(spotId));
      }}
    />
  );
}
