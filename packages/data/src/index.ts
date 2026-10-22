export { SPOTS, DEFAULT_SPOT_ID, getSpot } from './spots';
export { DEFAULT_THRESHOLDS, assessHour, classifyWind, spotThresholds } from './verdict';
export type { VerdictThresholds } from './verdict';
export { currentHourOf } from './current-hour';
export { isDaylight, isDaylightHour, sunTimes } from './daylight';
export { headlineFor } from './headline';
export type { Headline } from './headline';
export { formatDayName, formatHour, formatHourRange } from './time-format';
export { THUNDERSTORM_REASON, isThunderstorm, seaTempBand } from './weather';
export type { SeaTemp, SeaTempBand } from './weather';
export type { SunTimes } from './daylight';
export { findGoodWindows, nextGoodWindow, summarizeDays } from './summary';
export type { GoodWindow } from './summary';
export {
  DEFAULT_SWIM_THRESHOLDS,
  applyWaterQuality,
  assessSwimHour,
  findSwimWindows,
  highTideNear,
  isNearHighTide,
} from './swim';
export type { SwimThresholds, SwimWindow } from './swim';
export { fetchWaterQualityAlert, findBeachAlert } from './sources/epa-bathing';
export { fetchHourlyConditions } from './sources/open-meteo';
export { fetchBuoyObservation, fetchTideEvents, fetchTideGaugeReadings } from './sources/erddap';
export { SLACK_THRESHOLD_M, readingsAfter, tideTrend } from './tide-gauge';
export { isRecord, isNumberArray, isStringArray, asFiniteNumber } from './guards';
