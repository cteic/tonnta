import { AppFooter } from '@/components/app-footer';
import { HomeView } from '@/components/home-view';
import { loadSpotConditions } from '@/lib/conditions';

/**
 * Shared server composition for `/` (Donabate) and `/s/[spotId]`.
 *
 * No wrapper landmark here: `HomeView` owns the `<nav>` and the `<main>`, and
 * `AppFooter` is a `<footer>`. Wrapping both in a `<main>` would nest one
 * landmark inside another and put the footer inside the main content.
 */
export async function SpotScreen({ spotId }: { spotId: string }) {
  const conditions = await loadSpotConditions(spotId);

  return (
    <>
      <HomeView conditions={conditions} />
      <AppFooter />
    </>
  );
}
