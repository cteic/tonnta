import { DEFAULT_SPOT_ID } from '@tonnta/data';

export type Activity = 'surf' | 'swim';

// Descriptive swim identity until a separate brand is approved.
export const APP_IDENTITIES = {
  surf: { name: 'Tonnta', label: 'Surf conditions' },
  swim: { name: 'Tonnta Swim', label: 'Swimming conditions' },
} as const;

export type SpotPath = '/' | '/swim' | `/s/${string}` | `/swim/s/${string}`;

export function spotPath(activity: Activity, spotId: string): SpotPath {
  const slug = encodeURIComponent(spotId);
  if (activity === 'swim') return spotId === DEFAULT_SPOT_ID ? '/swim' : `/swim/s/${slug}`;
  return spotId === DEFAULT_SPOT_ID ? '/' : `/s/${slug}`;
}
