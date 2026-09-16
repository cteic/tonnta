import type { Verdict, WindState } from '@tonnta/types';

/** Display formatting, all in the spot's local clock (Europe/Dublin for v1). */

export function formatHour(isoTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoTime));
}

/** "11:00–14:00", collapsing single-hour windows to just "11:00". */
export function formatWindowRange(startIso: string, endIso: string, timezone: string): string {
  const start = formatHour(startIso, timezone);
  const end = formatHour(endIso, timezone);
  return start === end ? start : `${start}\u2013${end}`;
}

export function formatDayName(isoDateOrTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: timezone,
    weekday: 'short',
  }).format(new Date(isoDateOrTime));
}

export function formatDayDate(isoDateOrTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: timezone,
    day: 'numeric',
    month: 'short',
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

export const BOARD_LABEL: Record<string, string> = {
  sup: 'SUP',
  foamie: 'Foamie',
  longboard: 'Longboard',
};

export function compassPoint(degrees: number): string {
  const points = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
  ];
  const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16;
  const point = points[index];
  return point ?? 'N';
}
