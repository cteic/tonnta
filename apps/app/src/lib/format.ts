import type { Board, Verdict, WindState } from '@tonnta/types';

/** Display formatting, all in the spot's local clock. */

export function formatHour(isoTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoTime));
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * A run of forecast hours as a clock range. `lastHourIso` is the start of the
 * last hour in the run, so the range ends an hour after it: a single good
 * hour at 19:00 reads 19:00–20:00.
 */
export function formatHourRange(
  firstHourIso: string,
  lastHourIso: string,
  timezone: string
): string {
  const end = new Date(Date.parse(lastHourIso) + HOUR_MS).toISOString();
  return `${formatHour(firstHourIso, timezone)}–${formatHour(end, timezone)}`;
}

export function formatDayName(isoDateOrTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: timezone,
    weekday: 'short',
  }).format(new Date(isoDateOrTime));
}

export const VERDICT_LABEL: Record<Verdict, { english: string; irish: string }> = {
  go: { english: 'GO', irish: 'Téigh' },
  maybe: { english: 'MAYBE', irish: "B'fhéidir" },
  flat: { english: 'FLAT', irish: 'Ciúin' },
  blown: { english: 'BLOWN OUT', irish: 'Séidte' },
};

export const WIND_STATE_LABEL: Record<WindState, string> = {
  offshore: 'offshore',
  'cross-off': 'cross-off',
  cross: 'cross-shore',
  'cross-on': 'cross-on',
  onshore: 'onshore',
  glassy: 'glassy',
};

export const BOARD_LABEL: Record<Board, string> = {
  sup: 'SUP',
  foamie: 'Foamie',
  longboard: 'Longboard',
};
