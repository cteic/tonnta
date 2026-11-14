/**
 * Clock formatting in the spot's own timezone, shared by the web app, the
 * mobile app and the widgets so their times cannot drift apart.
 */

const HOUR_MS = 60 * 60 * 1000;

export function formatHour(isoTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoTime));
}

export function formatDayName(isoDateOrTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IE', { timeZone: timezone, weekday: 'short' }).format(
    new Date(isoDateOrTime)
  );
}

/**
 * A run of forecast hours as a clock range. `lastHourIso` is the start of
 * the run's last hour, so the range ends an hour after it: one good hour at
 * 19:00 reads 19:00–20:00.
 */
export function formatHourRange(
  firstHourIso: string,
  lastHourIso: string,
  timezone: string
): string {
  const end = new Date(Date.parse(lastHourIso) + HOUR_MS).toISOString();
  return `${formatHour(firstHourIso, timezone)}–${formatHour(end, timezone)}`;
}
