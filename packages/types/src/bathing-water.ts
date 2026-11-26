/**
 * An EPA Identified Bathing Water. Only the fields that rarely change live
 * here; ratings, lifeguards and restrictions are fetched live from the EPA.
 */
export interface BathingWater {
  /** EPA beach id, for example `IEEABWC020_0000_0100`. */
  id: string;
  /** URL slug built from the EPA name. */
  slug: string;
  name: string;
  county: string;
  localAuthority: string;
  latitude: number;
  longitude: number;
}

/** What the EPA says about a bathing water today. Missing fields are unknown. */
export interface BathingWaterStatus {
  beachId: string;
  /** For example "Excellent Quality". */
  classification?: string;
  classificationYear?: number;
  hasLifeguard?: boolean;
  /** The EPA's free-text lifeguard schedule, shown as written. */
  lifeguardAvailability?: string;
  isBlueFlag?: boolean;
  allSeasonRestriction?: boolean;
  allSeasonRestrictionReason?: string;
  /** The EPA says the water is at risk of short-term pollution, for example after rain. */
  shortTermPollutionRisk?: boolean;
  profileUrl?: string;
  /** When the EPA last changed this record. */
  lastUpdated?: string;
}

/** Weather model values for the beach's grid cell. Undefined where the model has none. */
export interface BathingWaterWeather {
  /** The model's time for the current values, ISO 8601 UTC. */
  time: string;
  airTemperatureC?: number;
  windSpeedKmh?: number;
  windGustKmh?: number;
  windDirectionDeg?: number;
  /** Total over the 48 hours up to `time`. Undefined if any hour is missing. */
  rainLast48hMm?: number;
}

/** Marine model values for the nearest sea cell. Undefined inland or where the model has none. */
export interface BathingWaterSea {
  time: string;
  waterTemperatureC?: number;
  waveHeightM?: number;
}
