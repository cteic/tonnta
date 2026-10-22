export { SPOTS, DEFAULT_SPOT_ID, getSpot } from './spots';
export { DEFAULT_THRESHOLDS, assessHour, classifyWind, spotThresholds } from './verdict';
export type { VerdictThresholds } from './verdict';
export { isDaylight, isDaylightHour, sunTimes } from './daylight';
export type { SunTimes } from './daylight';
export { findGoodWindows, nextGoodWindow, summarizeDays } from './summary';
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
export { fetchBuoyObservation, fetchTideEvents } from './sources/erddap';
export { isRecord, isNumberArray, isStringArray, asFiniteNumber } from './guards';
