import { useEffect, useState } from 'react';

import { AppState } from 'react-native';

import { sunTimes } from '@tonnta/data';
import type { Spot } from '@tonnta/types';

/** Update a visible recommendation at sunrise/sunset and after returning to the app. */
export function useDaylightClock(spot: Spot): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const at = Date.now();
      setNow(at);
      const times = [at, at + 86_400_000].flatMap((day) => {
        const sun = sunTimes(day, spot.latitude, spot.longitude);
        return [sun.sunrise, sun.sunset];
      });
      const next = times
        .filter((time): time is number => time !== undefined && time > at)
        .sort((a, b) => a - b)[0];
      // The minute cap also catches device-clock changes while foregrounded.
      timer = setTimeout(update, next === undefined ? 60_000 : Math.min(next - at + 1, 60_000));
    };
    update();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [spot.latitude, spot.longitude]);
  return now;
}
