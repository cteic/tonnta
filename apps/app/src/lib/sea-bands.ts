import type { HourlyConditions } from '@tonnta/types';

/**
 * The living sea: three drifting wave bands whose height, length and speed
 * come from the real conditions. Glassy days barely move, clean swell rolls
 * in long ordered bands, and onshore mess is short and quick. The same rules
 * drive the web hero, so both surfaces read the sea the same way.
 */

export interface SeaBand {
  amplitude: number;
  wavelength: number;
  /** Seconds to drift one full wavelength sideways. */
  cycleS: number;
  opacity: number;
  offsetY: number;
}

/** The web hero drifts 1440px per base duration; native keeps the same speed. */
const DRIFT_PX = 1440;

export function seaBands(hour: HourlyConditions | undefined): SeaBand[] {
  const wave = hour?.waveHeightM ?? 0.2;
  const windState = hour?.windState ?? 'glassy';
  const messy = windState === 'onshore' || windState === 'cross-on';
  const glassy = windState === 'glassy';

  // A 0.1 m ripple draws a 3 pt band; 1.2 m of swell draws about 26 pt.
  const amplitude = Math.max(3, Math.min(26, wave * 22));
  const wavelength = messy ? 90 : 220;
  let baseDuration = 24;
  if (glassy) baseDuration = 46;
  if (messy) baseDuration = 12;

  const bands = [
    { scale: 0.55, length: 1.35, duration: 1.6, opacity: 0.28, offsetY: 6 },
    { scale: 0.8, length: 1, duration: 1, opacity: 0.45, offsetY: 26 },
    { scale: 1, length: 0.75, duration: 0.7, opacity: 0.85, offsetY: 48 },
  ];
  return bands.map((band) => {
    const bandLength = wavelength * band.length;
    return {
      amplitude: amplitude * band.scale,
      wavelength: bandLength,
      cycleS: (bandLength * baseDuration * band.duration) / DRIFT_PX,
      opacity: band.opacity,
      offsetY: band.offsetY,
    };
  });
}

/** A filled sine-like band path, repeating every `wavelength` points. */
export function seaBandPath(
  band: Pick<SeaBand, 'amplitude' | 'wavelength'>,
  width: number,
  baseY: number,
  height: number
): string {
  const half = band.wavelength / 2;
  let path = `M0 ${baseY}`;
  for (let x = 0; x < width; x += band.wavelength) {
    path += ` q ${half / 2} ${-band.amplitude * 2} ${half} 0 q ${half / 2} ${band.amplitude * 2} ${half} 0`;
  }
  return `${path} V ${height} H 0 Z`;
}
