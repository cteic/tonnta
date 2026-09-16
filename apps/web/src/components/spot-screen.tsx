import { AppFooter } from '@/components/app-footer';
import { HomeView } from '@/components/home-view';
import { loadSpotConditions } from '@/lib/conditions';

/** Shared server composition for `/` (Donabate) and `/s/[spotId]`. */
export async function SpotScreen({ spotId }: { spotId: string }) {
  const conditions = await loadSpotConditions(spotId);

  return (
    <main>
      <HomeView conditions={conditions} />
      <AppFooter />
    </main>
  );
}
