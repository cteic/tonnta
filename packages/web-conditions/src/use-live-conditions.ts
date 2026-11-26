'use client';

import { useEffect, useState } from 'react';

import type { SpotConditions } from './conditions';
import { conditionsAt, nextConditionsCheckDelay } from './live-conditions';

/** Local clock only: no repeated API calls or browser-router refreshes. */
export function useLiveConditions(initial: SpotConditions): SpotConditions {
  const [now, setNow] = useState<number>();
  const { latitude, longitude } = initial.spot;
  const { loadedAt } = initial;
  const checkedAt =
    initial.waterQualityCheck?.status === 'checked'
      ? initial.waterQualityCheck.checkedAt
      : undefined;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (timer !== undefined) clearTimeout(timer);
      const at = Date.now();
      setNow(at);
      timer = setTimeout(
        update,
        nextConditionsCheckDelay(at, latitude, longitude, loadedAt, checkedAt)
      );
    };
    update();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [latitude, longitude, loadedAt, checkedAt]);
  // Initial HTML and hydration agree; immediately recheck the actual clock on mount.
  return now === undefined ? initial : conditionsAt(initial, now);
}
