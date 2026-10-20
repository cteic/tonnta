import type { HourlyConditions } from '@tonnta/types';

export function currentHour(hours: HourlyConditions[], now: number): HourlyConditions {
  const hour = hours.find((entry) => {
    const start = Date.parse(entry.time);
    return start <= now && now < start + 60 * 60 * 1000;
  });
  if (hour === undefined) throw new Error('No forecast for the current hour');
  return hour;
}
