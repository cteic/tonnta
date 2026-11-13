/**
 * Tonnta domain types
 * -------------------
 * Everything is spot-driven: Donabate is the launch spot, but famous Irish
 * spots (Bundoran, Lahinch, Strandhill…) and Fuerteventura are config
 * entries, not rebuilds. A spot's `facing` bearing is what turns a wind
 * direction into onshore/offshore — the core of the verdict.
 */

export type SpotId = string;

/** Per-spot verdict tuning — what counts as flat/go differs per coast. */
export interface VerdictThresholds {
  /** Below this the sea is flat (m). */
  flatBelowM: number;
  /** At or above this it's rideable (m). */
  goFromM: number;
  /** Optional conservative GO gate on modeled mean wave period, not a calibrated surf threshold. */
  minGoPeriodS?: number;
  /** Max wind for a clean GO (km/h). */
  maxWindKmh: number;
  /** Wind allowance when it's blowing offshore (km/h). */
  maxWindOffshoreKmh: number;
  /** Onshore wind above this kills the day regardless of waves (km/h). */
  blownOnshoreKmh: number;
}

export interface Spot {
  id: SpotId;
  name: string;
  /** Irish-language name where one exists (brand layer, shown as eyebrow). */
  irishName?: string;
  region: string;
  country: 'IE' | 'ES';
  latitude: number;
  longitude: number;
  timezone: string;
  /** Compass bearing (deg true) the beach faces — Donabate ≈ 70 (ENE). */
  facing: number;
  /** Nearest live buoy station on Marine Institute ERDDAP (e.g. "M2"). */
  buoyStationId?: string;
  /** Nearest tide-prediction station on ERDDAP (e.g. "Skerries"). */
  tideStationId?: string;
  /** Nearest live tide gauge on the Irish National Tide Gauge Network (e.g. "Skerries Harbour"). */
  tideGaugeId?: string;
  /** EPA bathing-water beach id (data.epa.ie), where the spot is a bathing water. */
  epaBeachId?: string;
  /** Verdict tuning for this coast; defaults apply when omitted. */
  thresholds?: VerdictThresholds;
}

export type WindState = 'offshore' | 'cross-off' | 'cross' | 'cross-on' | 'onshore' | 'glassy';

export interface HourlyConditions {
  time: string; // ISO 8601, UTC
  waveHeightM: number;
  wavePeriodS: number;
  waveDirectionDeg: number;
  windSpeedKmh: number;
  windGustKmh: number;
  windDirectionDeg: number;
  windState: WindState;
  seaTempC?: number;
  /** WMO weather code from the forecast, for example 95 for a thunderstorm. */
  weatherCode?: number;
}

export type Verdict = 'go' | 'maybe' | 'flat' | 'blown';

export type Board = 'sup' | 'foamie' | 'longboard';

export interface VerdictResult {
  verdict: Verdict;
  /** Primary board pick, present when the verdict is surfable. */
  board?: Board;
  /** One human sentence: "Worth a look after work — 0.5m and the wind drops at 4." */
  reason: string;
}

export type SwimVerdict = 'great' | 'ok' | 'no';

export interface SwimVerdictResult {
  verdict: SwimVerdict;
  /** Unknown notices withhold a recommendation; this is not a known hazard. */
  withheld?: 'water-quality-unknown';
  /** Modeled physical conditions or the reason a recommendation is withheld. */
  reason: string;
  /** Within ±2h of high tide — the swimmable window at a shallow beach. */
  nearHighTide: boolean;
}

/** Retrieval knowledge, distinct from a notice's issuance or a water sample time. */
export type WaterQualityCheck =
  | { status: 'checked'; checkedAt: number }
  | { status: 'unavailable'; attemptedAt: number }
  | { status: 'unmapped' };

export type WaterQualityStatus =
  | 'restricted'
  | 'not-reported'
  /** Legacy notice-fetch success, not knowledge of current water quality. */
  | 'checked'
  | 'unavailable'
  | 'unmapped'
  | 'stale'
  | 'unchecked';

/** An active EPA bathing-water incident for a beach. */
export interface WaterQualityAlert {
  beachId: string;
  beachName: string;
  restrictionInPlace: boolean;
  startDate?: string;
}

export interface DailySummary {
  date: string; // YYYY-MM-DD in spot-local time
  verdict: Verdict;
  board?: Board;
  maxWaveHeightM: number;
  dominantWindState: WindState;
  /** Best surfable window in spot-local time, when one exists. */
  bestWindow?: { start: string; end: string };
}

/** One observed water level from a tide gauge. Heights are metres relative to OD Malin, not local mean sea level or LAT. */
export interface TideGaugeReading {
  time: string; // ISO 8601, UTC
  levelM: number;
}

export type TideTrend = 'rising' | 'falling' | 'slack';

/** Predicted high/low water. Heights are metres relative to OD Malin. */
export interface TideEvent {
  time: string; // ISO 8601, UTC
  kind: 'high' | 'low';
  heightM: number;
}

export interface BuoyObservation {
  stationId: string;
  time: string; // ISO 8601, UTC
  waveHeightM?: number;
  wavePeriodS?: number;
  windSpeedKmh?: number;
  windDirectionDeg?: number;
  seaTempC?: number;
  source: 'marine-institute' | 'cil-dublin-bay';
}
