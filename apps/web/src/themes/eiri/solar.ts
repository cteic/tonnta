/**
 * Solar palette engine — Éirí's sky is computed, not fixed.
 *
 * Sun altitude comes from the standard NOAA solar-position approximation
 * (declination + equation of time → hour angle → altitude), accurate to a
 * fraction of a degree: plenty for painting light. Everything downstream is
 * a pure mapping from (altitude, rising) to a scene, so two people opening
 * the app at the same minute in Donabate see the same sky as the window.
 */

export type SkyPhase = 'night' | 'predawn' | 'sunrise' | 'day' | 'sunset' | 'dusk';

export interface SolarScene {
  phase: SkyPhase;
  altitudeDeg: number;
  rising: boolean;
  /** CSS stops for the sky above the horizon, top → horizon. */
  skyStops: string[];
  /** Water base below the horizon. */
  water: string;
  /** Verdict + copy colours guaranteed legible on this sky. */
  text: string;
  textMuted: string;
  /** Horizon glow strength 0–1. */
  glow: number;
  disc: 'sun' | 'moon';
  /** Disc height above the horizon, 0 (on it) – 1 (high). */
  discAltitude01: number;
}

const RAD = Math.PI / 180;

interface SunPosition {
  altitudeDeg: number;
  rising: boolean;
}

/** NOAA approximation; date interpreted at its own UTC instant. */
export function sunPosition(date: Date, latitude: number, longitude: number): SunPosition {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  const gamma = ((2 * Math.PI) / 365) * (dayOfYear + (hour - 12) / 24);
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  const timeOffset = eqTime + 4 * longitude;
  const trueSolarMinutes = hour * 60 + timeOffset;
  const hourAngleDeg = trueSolarMinutes / 4 - 180;

  const cosZenith =
    Math.sin(latitude * RAD) * Math.sin(decl) +
    Math.cos(latitude * RAD) * Math.cos(decl) * Math.cos(hourAngleDeg * RAD);
  const clamped = Math.min(1, Math.max(-1, cosZenith));
  const altitudeDeg = 90 - Math.acos(clamped) / RAD;

  return { altitudeDeg, rising: hourAngleDeg < 0 };
}

function classify(altitudeDeg: number, rising: boolean): SkyPhase {
  if (altitudeDeg < -12) return 'night';
  if (altitudeDeg < 0) return rising ? 'predawn' : 'dusk';
  if (altitudeDeg < 10) return rising ? 'sunrise' : 'sunset';
  return 'day';
}

const SCENES: Record<
  SkyPhase,
  Omit<SolarScene, 'phase' | 'altitudeDeg' | 'rising' | 'discAltitude01'>
> = {
  night: {
    skyStops: ['#080D1A', '#0E1428', '#131F2A'],
    water: '#0A1A20',
    text: '#EDEDE2',
    textMuted: 'rgba(214, 224, 219, 0.75)',
    glow: 0.08,
    disc: 'moon',
  },
  predawn: {
    skyStops: ['#10142E', '#1D2440', '#4C3A52', '#7A4A44'],
    water: '#10262E',
    text: '#F5EFE3',
    textMuted: 'rgba(233, 226, 210, 0.8)',
    glow: 0.35,
    disc: 'moon',
  },
  sunrise: {
    skyStops: ['#1D2440', '#4C3A52', '#C47A3A', '#E8A33D'],
    water: '#12333A',
    text: '#FFF6E6',
    textMuted: 'rgba(255, 240, 216, 0.85)',
    glow: 1,
    disc: 'sun',
  },
  day: {
    skyStops: ['#5E7A88', '#84A0AC', '#AEC4CA'],
    water: '#2E5561',
    text: '#0F2229',
    textMuted: 'rgba(18, 42, 51, 0.78)',
    glow: 0.15,
    disc: 'sun',
  },
  sunset: {
    skyStops: ['#28304E', '#6D4250', '#C4553B', '#E08A4A'],
    water: '#1C3F42',
    text: '#FFF2E2',
    textMuted: 'rgba(255, 234, 212, 0.85)',
    glow: 0.9,
    disc: 'sun',
  },
  dusk: {
    skyStops: ['#131A36', '#232A4A', '#41374E', '#5E4444'],
    water: '#122A31',
    text: '#F0EBDF',
    textMuted: 'rgba(226, 220, 206, 0.78)',
    glow: 0.3,
    disc: 'moon',
  },
};

export function solarScene(date: Date, latitude: number, longitude: number): SolarScene {
  const { altitudeDeg, rising } = sunPosition(date, latitude, longitude);
  const phase = classify(altitudeDeg, rising);
  const base = SCENES[phase];
  const discAltitude01 = Math.min(1, Math.max(0, altitudeDeg / 45));
  return { phase, altitudeDeg, rising, discAltitude01, ...base };
}

export function skyGradient(scene: SolarScene): string {
  const stops = scene.skyStops;
  const step = 68 / Math.max(1, stops.length - 1);
  const css = stops.map((stop, index) => `${stop} ${Math.round(index * step)}%`);
  return `linear-gradient(180deg, ${css.join(', ')}, ${scene.water} 69%, ${scene.water} 100%)`;
}
