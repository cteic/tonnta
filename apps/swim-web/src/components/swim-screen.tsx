import { loadSpotConditions } from '@tonnta/web-conditions/server';

import { SwimFooter } from './swim-footer';
import { SwimView } from './swim-view';

/** `SwimView` owns the `<nav>` and `<main>`; the footer sits outside both. */
export async function SwimScreen({ spotId }: { spotId: string }) {
  const conditions = await loadSpotConditions(spotId);
  return (
    <>
      <SwimView conditions={conditions} />
      <SwimFooter spotId={spotId} />
    </>
  );
}
