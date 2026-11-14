import type { Verdict } from '@tonnta/types';

/**
 * An Cairt stamps the verdict on the chart the way a harbourmaster approves
 * a document. Magenta is the Admiralty's "this matters now" and appears only
 * on GO; BLOWN gets the prohibited-anchorage treatment.
 */

export interface StampTreatment {
  /** Stamp ink + double-rule colour. */
  ink: string;
  /** Fill behind the stamp face. */
  fill: string;
  /** Barred-circle overlay, prohibited-anchorage style. */
  barred: boolean;
}

const NOTICE_MAGENTA = '#B8266B';
const SOUNDING_INK = '#12333E';
const CONTOUR_GREY = '#7A97A1';
const WARNING_RUST = '#B3401F';

export function stampTreatment(verdict: Verdict): StampTreatment {
  switch (verdict) {
    case 'go':
      return { ink: NOTICE_MAGENTA, fill: 'rgba(184,38,107,0.06)', barred: false };
    case 'maybe':
      return { ink: SOUNDING_INK, fill: 'transparent', barred: false };
    case 'flat':
      return { ink: CONTOUR_GREY, fill: 'transparent', barred: false };
    case 'blown':
      return { ink: WARNING_RUST, fill: 'rgba(179,64,31,0.05)', barred: true };
  }
}
