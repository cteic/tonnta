import type { HourlyConditions } from '@tonnta/types';

/** WMO weather codes for thunderstorms: 95, and 96 or 99 with hail. */
const THUNDERSTORM_CODES: readonly number[] = [95, 96, 99];

/** Lightning means out of the water, whatever the waves are doing. */
export function isThunderstorm(hour: HourlyConditions): boolean {
  return hour.weatherCode !== undefined && THUNDERSTORM_CODES.includes(hour.weatherCode);
}

export const THUNDERSTORM_REASON =
  'Thunderstorms forecast. Lightning risk, so stay out of the water.';

export type SeaTempBand = 'baltic' | 'bracing' | 'fresh' | 'mild' | 'warm';

export interface SeaTemp {
  band: SeaTempBand;
  label: string;
  /** What to wear, for an Irish beach. */
  advice: string;
}

/** Lower bound of each band in °C, warmest first. */
const SEA_TEMP_BANDS: readonly { from: number; temp: SeaTemp }[] = [
  { from: 19, temp: { band: 'warm', label: 'Warm', advice: 'Togs and in you go.' } },
  {
    from: 16,
    temp: {
      band: 'mild',
      label: 'Mild',
      advice: 'Togs are fine for a swim; a wetsuit for longer.',
    },
  },
  {
    from: 13,
    temp: { band: 'fresh', label: 'Fresh', advice: 'A wetsuit for a proper swim, togs for a dip.' },
  },
  {
    from: 10,
    temp: {
      band: 'bracing',
      label: 'Bracing',
      advice: 'Wetsuit, or a quick dip and straight out.',
    },
  },
];

const COLDEST: SeaTemp = {
  band: 'baltic',
  label: 'Baltic',
  advice: 'Cold-water shock territory. Wetsuit, gloves, and never alone.',
};

export function seaTempBand(seaTempC: number): SeaTemp {
  return SEA_TEMP_BANDS.find((entry) => seaTempC >= entry.from)?.temp ?? COLDEST;
}
