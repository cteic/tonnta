export { SPOTS, DEFAULT_SPOT_ID, getSpot } from './spots';
export { DEFAULT_THRESHOLDS, assessHour, classifyWind, spotThresholds } from './verdict';
export type { VerdictThresholds } from './verdict';
export { findGoodWindows, isSessionTime, nextGoodWindow, summarizeDays } from './summary';
export type { GoodWindow } from './summary';
export {
  DEFAULT_SWIM_THRESHOLDS,
  applyWaterQuality,
  assessSwimHour,
  findSwimWindows,
  isNearHighTide,
} from './swim';
export type { SwimThresholds, SwimWindow } from './swim';
export { fetchWaterQualityAlert, findBeachAlert } from './sources/epa-bathing';
export { fetchHourlyConditions } from './sources/open-meteo';
export { fetchBuoyObservation, fetchTideEvents, fetchTideGaugeReadings } from './sources/erddap';
export { SLACK_THRESHOLD_M, readingsAfter, tideTrend } from './tide-gauge';
export { isRecord, isNumberArray, isStringArray, asFiniteNumber } from './guards';
