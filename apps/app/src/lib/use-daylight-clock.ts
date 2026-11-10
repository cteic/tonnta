import { useEffect, useState } from 'react';

import { AppState } from 'react-native';

import { sunTimes } from '@tonnta/data';
import type { Spot } from '@tonnta/types';

/** Update a visible recommendation at sunrise/sunset and after returning to the app. */
export function clockUpdateDelay(
  now: number,
  deadlines: (number | undefined)[],
  solarBoundaries: (number | undefined)[] = []
): number {
  // Sunset itself is still daylight; sample just after solar boundaries.
  const next = [
    ...deadlines,
    ...solarBoundaries.map((time) => (time === undefined ? undefined : time + 1)),
  ]
    .filter((time): time is number => time !== undefined && Number.isFinite(time) && time > now)
    .sort((a, b) => a - b)[0];
  return next === undefined ? 60_000 : Math.max(1, Math.min(next - now, 60_000));
}

export function useDaylightClock(
  spot: Spot,
  forecastExpiresAt?: number,
  waterQualityExpiresAt?: number
): number {
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
      // The minute cap also catches device-clock changes while foregrounded.
      timer = setTimeout(
        update,
        clockUpdateDelay(at, [forecastExpiresAt, waterQualityExpiresAt], times)
      );
    };
    update();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [spot.latitude, spot.longitude, forecastExpiresAt, waterQualityExpiresAt]);
  return now;
}
