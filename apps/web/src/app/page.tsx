import { DEFAULT_SPOT_ID } from '@tonnta/data';

import { SpotScreen } from '@/components/spot-screen';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  return <SpotScreen spotId={DEFAULT_SPOT_ID} />;
}
