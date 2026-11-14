const HOUR_MS = 60 * 60 * 1000;

interface Timed {
  time: string;
}

/**
 * The forecast hour in progress at `now`: the last entry that started at or
 * before `now` and spans it. With no such entry (before the forecast starts,
 * or across a gap in it), the next entry to start; past the end, the last.
 */
export function currentHourOf<T extends Timed>(hours: readonly T[], now: number): T | undefined {
  let started: T | undefined;
  for (const hour of hours) {
    if (Date.parse(hour.time) <= now) started = hour;
  }
  if (started !== undefined && Date.parse(started.time) + HOUR_MS > now) return started;
  return hours.find((hour) => Date.parse(hour.time) > now) ?? hours.at(-1);
}
