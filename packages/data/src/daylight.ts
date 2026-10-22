/**
 * Sunrise and sunset from latitude, longitude and date, with the standard
 * sunrise equation (NOAA's simplified form). Accurate to a couple of minutes,
 * which is plenty for deciding whether an hour is light enough to surf or
 * swim. Pure maths, so the worker, the apps and the widgets agree with no API.
 */

const DEG = Math.PI / 180;
const MS_PER_DAY = 86_400_000;
const J2000 = 2_451_545;
const UNIX_EPOCH_JD = 2_440_587.5;
const HALF_HOUR_MS = 30 * 60 * 1000;

/** The sun's centre 0.833° below the horizon: refraction plus its radius. */
const SUNRISE_ALTITUDE_DEG = -0.833;

export interface SunTimes {
  /** Undefined in polar night or midnight sun, when there is no sunrise. */
  sunrise?: number;
  sunset?: number;
  /** True when the sun stays up all day. */
  allDay: boolean;
}

function toJulianDay(ms: number): number {
  return ms / MS_PER_DAY + UNIX_EPOCH_JD;
}

function fromJulianDay(jd: number): number {
  return (jd - UNIX_EPOCH_JD) * MS_PER_DAY;
}

/** Sun times for the solar day `cycle` days after J2000, at `longitude` (east positive). */
function sunTimesForCycle(cycle: number, latitude: number, longitude: number): SunTimes {
  const meanSolarNoon = cycle - longitude / 360;
  const anomaly = (357.5291 + 0.98560028 * meanSolarNoon) % 360;
  const m = anomaly * DEG;
  const centre = 1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m);
  const eclipticLongitude = ((anomaly + centre + 180 + 102.9372) % 360) * DEG;
  const transit =
    J2000 + meanSolarNoon + 0.0053 * Math.sin(m) - 0.0069 * Math.sin(2 * eclipticLongitude);
  const declination = Math.asin(Math.sin(eclipticLongitude) * Math.sin(23.4397 * DEG));
  const phi = latitude * DEG;
  const cosHourAngle =
    (Math.sin(SUNRISE_ALTITUDE_DEG * DEG) - Math.sin(phi) * Math.sin(declination)) /
    (Math.cos(phi) * Math.cos(declination));
  if (cosHourAngle > 1) return { allDay: false };
  if (cosHourAngle < -1) return { allDay: true };
  const halfDay = Math.acos(cosHourAngle) / DEG / 360;
  return {
    sunrise: fromJulianDay(transit - halfDay),
    sunset: fromJulianDay(transit + halfDay),
    allDay: false,
  };
}

/** Sunrise and sunset for the solar day around `at`. */
export function sunTimes(at: number, latitude: number, longitude: number): SunTimes {
  const cycle = Math.round(toJulianDay(at) - J2000 - 0.0009 + longitude / 360);
  return sunTimesForCycle(cycle, latitude, longitude);
}

/** True when `at` falls between sunrise and sunset at the location. */
export function isDaylight(at: number, latitude: number, longitude: number): boolean {
  const times = sunTimes(at, latitude, longitude);
  if (times.allDay) return true;
  if (times.sunrise === undefined || times.sunset === undefined) return false;
  return at >= times.sunrise && at <= times.sunset;
}

/**
 * True when a forecast hour starting at `isoTime` is light enough to be in
 * the water: the middle of the hour falls between sunrise and sunset. With a
 * 08:40 sunrise the 09:00 hour counts and the 08:00 hour does not.
 */
export function isDaylightHour(
  isoTime: string,
  location: { latitude: number; longitude: number }
): boolean {
  const start = Date.parse(isoTime);
  if (Number.isNaN(start)) return false;
  return isDaylight(start + HALF_HOUR_MS, location.latitude, location.longitude);
}
