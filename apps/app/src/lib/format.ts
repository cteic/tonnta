import type { Board, Verdict, WindState } from '@tonnta/types';

/** Display formatting, all in the spot's local clock. */

export function formatHour(isoTime: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoTime));
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
