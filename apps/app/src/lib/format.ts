import type { Board, Verdict, WindState } from '@tonnta/types';

/** Display formatting, all in the spot's local clock. */

// Shared with the web app and the widgets, so their clocks agree.
export { formatDayName, formatHour, formatHourRange } from '@tonnta/data';

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
