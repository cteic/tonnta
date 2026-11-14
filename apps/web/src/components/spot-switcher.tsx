'use client';

import { useRouter } from 'next/navigation';

import { SpotMenu } from '@tonnta/web-shell';

import { type Activity, spotPath } from '@/lib/activity';

/** Donabate lives at `/`; every other spot at `/s/<id>`, or under `/swim`. */
export function SpotSwitcher({
  activeSpotId,
  activity = 'surf',
}: {
  activeSpotId: string;
  activity?: Activity;
}) {
  const router = useRouter();
  return (
    <SpotMenu
      activeSpotId={activeSpotId}
      onSelect={(spotId) => {
        router.push(spotPath(activity, spotId));
      }}
    />
  );
}
