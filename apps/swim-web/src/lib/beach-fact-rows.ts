import { compassPoint } from '@tonnta/web-conditions';

import type { BeachFacts } from './beach-facts';

/**
 * Turns the loaded sources into rows of plain facts. Every row names its
 * source. Nothing here says whether to swim: no verdict, no rating of our
 * own, no positive state. Missing data reads "Unknown", never as fine.
 */

export type FactTone = 'notice' | 'plain';

export interface FactRow {
  label: string;
  value: string;
  detail?: string | undefined;
  source: string;
  tone: FactTone;
}

export const SOURCES: Readonly<Record<'epa' | 'epaAlerts' | 'weather' | 'marine', string>> = {
  epa: 'EPA',
  epaAlerts: 'EPA alerts',
  weather: 'Open-Meteo weather model',
  marine: 'Open-Meteo marine model',
};

const UNKNOWN = 'Unknown';

function irishDay(iso: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function irishTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

function seasonRow({ season }: BeachFacts): FactRow {
  if (season.inSeason) {
    return {
      label: 'Bathing season',
      value: 'In season',
      detail: `The EPA tests bathing water from 1 June to 15 September. This season ends ${irishDay(season.end)}.`,
      source: SOURCES.epa,
      tone: 'plain',
    };
  }
  return {
    label: 'Bathing season',
    value: 'Outside the bathing season',
    detail: `The EPA tests bathing water from 1 June to 15 September. The next season starts ${irishDay(season.start)}.`,
    source: SOURCES.epa,
    tone: 'notice',
  };
}

function alertRow({ alert, season }: BeachFacts): FactRow {
  const base = { label: 'EPA alert', source: SOURCES.epaAlerts };
  if (!alert.ok) {
    return { ...base, value: UNKNOWN, detail: 'EPA alerts did not load.', tone: 'notice' };
  }
  const current = alert.value;
  if (current?.restrictionInPlace === true) {
    return {
      ...base,
      value: 'Bathing restriction in place',
      detail: current.startDate === undefined ? undefined : `Since ${irishDay(current.startDate)}.`,
      tone: 'notice',
    };
  }
  if (current !== undefined) {
    return {
      ...base,
      value: 'Incident listed',
      detail: 'The EPA lists an incident here without a bathing restriction.',
      tone: 'notice',
    };
  }
  return {
    ...base,
    value: 'No active alert listed',
    detail: season.inSeason
      ? undefined
      : 'Outside the season the EPA does not test, so no alert does not mean the water was tested.',
    tone: 'plain',
  };
}

interface StatusRows {
  /** Shown near the top, next to the alert, when the EPA lists one. */
  restriction?: FactRow;
  rest: FactRow[];
}

function pollutionValue(risk: boolean | undefined): string {
  if (risk === undefined) return UNKNOWN;
  return risk ? 'Listed as at risk' : 'Not listed as at risk';
}

function statusRows({ status }: BeachFacts): StatusRows {
  if (!status.ok) {
    return {
      rest: [
        {
          label: 'EPA record',
          value: UNKNOWN,
          detail: 'The EPA record for this bathing water did not load.',
          source: SOURCES.epa,
          tone: 'notice',
        },
      ],
    };
  }
  const record = status.value;
  const rating =
    record.classification === undefined
      ? UNKNOWN
      : `${record.classification}${record.classificationYear === undefined ? '' : ` (${record.classificationYear})`}`;
  const rows: StatusRows = {
    rest: [
      {
        label: 'Water quality rating',
        value: rating,
        detail:
          'The EPA rates each bathing water yearly from four seasons of samples. It is not a reading of the water today.',
        source: SOURCES.epa,
        tone: record.classification === undefined ? 'notice' : 'plain',
      },
      {
        label: 'Short-term pollution risk',
        value: pollutionValue(record.shortTermPollutionRisk),
        detail:
          record.shortTermPollutionRisk === true ? 'For example after heavy rain.' : undefined,
        source: SOURCES.epa,
        tone: record.shortTermPollutionRisk === false ? 'plain' : 'notice',
      },
      lifeguardRow(record.hasLifeguard, record.lifeguardAvailability),
    ],
  };
  if (record.allSeasonRestriction === true) {
    rows.restriction = {
      label: 'All-season restriction',
      value: 'In place',
      detail: record.allSeasonRestrictionReason,
      source: SOURCES.epa,
      tone: 'notice',
    };
  }
  return rows;
}

function lifeguardRow(
  hasLifeguard: boolean | undefined,
  availability: string | undefined
): FactRow {
  const base = { label: 'Lifeguards', source: SOURCES.epa };
  if (hasLifeguard === true) {
    return {
      ...base,
      value: availability ?? 'Listed, hours not given',
      detail: 'Cover as the EPA lists it. Snámh cannot see whether a lifeguard is on duty now.',
      tone: 'plain',
    };
  }
  if (hasLifeguard === false) {
    return { ...base, value: 'No lifeguard listed', tone: 'notice' };
  }
  return { ...base, value: UNKNOWN, tone: 'notice' };
}

function weatherRows({ weather }: BeachFacts): FactRow[] {
  const base = { source: SOURCES.weather };
  if (!weather.ok) {
    return [
      { ...base, label: 'Rain, last 48 hours', value: UNKNOWN, tone: 'notice' },
      { ...base, label: 'Air and wind', value: UNKNOWN, tone: 'plain' },
    ];
  }
  const w = weather.value;
  const wind =
    w.windSpeedKmh === undefined
      ? undefined
      : `wind ${Math.round(w.windSpeedKmh)} km/h${w.windDirectionDeg === undefined ? '' : ` from ${compassPoint(w.windDirectionDeg)}`}${w.windGustKmh === undefined ? '' : `, gusts ${Math.round(w.windGustKmh)} km/h`}`;
  const air = w.airTemperatureC === undefined ? undefined : `${w.airTemperatureC.toFixed(1)}°C air`;
  const airAndWind = [air, wind].filter((part) => part !== undefined).join(', ');
  return [
    {
      ...base,
      label: 'Rain, last 48 hours',
      value: w.rainLast48hMm === undefined ? UNKNOWN : `${w.rainLast48hMm.toFixed(1)} mm`,
      detail: 'The EPA advises staying out of the water for 48 hours after heavy rain.',
      tone: w.rainLast48hMm === undefined ? 'notice' : 'plain',
    },
    {
      ...base,
      label: 'Air and wind',
      value: airAndWind === '' ? UNKNOWN : airAndWind,
      detail: `Model estimate for ${irishTime(w.time)}, not a measurement at the beach.`,
      tone: 'plain',
    },
  ];
}

function seaRows({ sea }: BeachFacts): FactRow[] {
  const base: { source: string; tone: FactTone } = { source: SOURCES.marine, tone: 'plain' };
  if (!sea.ok) {
    return [{ ...base, label: 'Water temperature and waves', value: UNKNOWN }];
  }
  const s = sea.value;
  if (s.waterTemperatureC === undefined && s.waveHeightM === undefined) {
    return [
      {
        ...base,
        label: 'Water temperature and waves',
        value: 'No model value here',
        detail: 'The marine model has no value for this spot, for example at a lake or river.',
      },
    ];
  }
  const parts = [
    s.waterTemperatureC === undefined ? undefined : `${s.waterTemperatureC.toFixed(1)}°C water`,
    s.waveHeightM === undefined ? undefined : `${s.waveHeightM.toFixed(1)} m waves`,
  ].filter((part) => part !== undefined);
  return [
    {
      ...base,
      label: 'Water temperature and waves',
      value: parts.join(', '),
      detail: `Model estimate for the nearest open-sea cell at ${irishTime(s.time)}. The water at the shore can differ.`,
    },
  ];
}

export function beachFactRows(facts: BeachFacts): FactRow[] {
  const status = statusRows(facts);
  return [
    alertRow(facts),
    ...(status.restriction === undefined ? [] : [status.restriction]),
    seasonRow(facts),
    ...status.rest,
    ...weatherRows(facts),
    ...seaRows(facts),
  ];
}
