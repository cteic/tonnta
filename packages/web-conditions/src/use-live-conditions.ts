'use client';

import { useEffect, useState } from 'react';

import { sunTimes } from '@tonnta/data';

import type { SpotConditions } from './conditions';
import { conditionsAt } from './live-conditions';

/** Local clock only: no repeated API calls or browser-router refreshes. */
export function useLiveConditions(initial: SpotConditions): SpotConditions {
  const [now, setNow] = useState<number>();
  const { latitude, longitude } = initial.spot;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      if (timer !== undefined) clearTimeout(timer);
      const at = Date.now();
      setNow(at);
      const { sunrise, sunset } = sunTimes(at, latitude, longitude);
      // Recheck just beyond a solar boundary rather than leaving GO visible
      // until a polling tick. The cap also catches clock changes promptly.
      const delays = [15_000];
      for (const boundary of [sunrise, sunset]) {
        if (boundary !== undefined && boundary >= at) delays.push(boundary - at + 1);
      }
      timer = setTimeout(update, Math.max(1, Math.min(...delays)));
    };
    update();
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [latitude, longitude]);
  // Initial HTML and hydration agree; immediately recheck the actual clock on mount.
  return now === undefined ? initial : conditionsAt(initial, now);
}
