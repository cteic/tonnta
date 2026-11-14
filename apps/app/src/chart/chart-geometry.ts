import type { Verdict } from '@tonnta/types';

import type { ChartHour } from '../lib/conditions';

/**
 * Pure geometry for the 24-hour conditions chart: scales, SVG paths and the
 * hour under a finger. No React and no native modules, so it runs under
 * vitest and the component only draws what this returns.
 */

export interface ChartBox {
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface VerdictBand {
  x: number;
  width: number;
  verdict: Verdict;
}

export interface AxisTick {
  x: number;
  time: string;
}

export interface ChartGeometry {
  bands: VerdictBand[];
  waveLine: string;
  waveArea: string;
  windLine: string;
  /** Top of the wave axis in metres, rounded up to a half metre. */
  waveMaxM: number;
  /** Top of the wind axis in km/h, rounded up to 10. */
  windMaxKmh: number;
  ticks: AxisTick[];
  /** Centre x of each hour, for the scrub marker. */
  centres: number[];
}

/** The smallest wave axis, so a flat day does not fill the chart with noise. */
const MIN_WAVE_AXIS_M = 1;
const MIN_WIND_AXIS_KMH = 30;
const TICK_EVERY_HOURS = 6;

function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

function point(x: number, y: number): string {
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

export function buildChartGeometry(hours: ChartHour[], box: ChartBox): ChartGeometry {
  const plotWidth = Math.max(box.width - box.left - box.right, 0);
  const plotHeight = Math.max(box.height - box.top - box.bottom, 0);
  const slot = hours.length === 0 ? 0 : plotWidth / hours.length;
  const baseline = box.top + plotHeight;

  const waveMaxM = roundUp(
    Math.max(MIN_WAVE_AXIS_M, ...hours.map((hour) => hour.waveHeightM)),
    0.5
  );
  const windMaxKmh = roundUp(
    Math.max(MIN_WIND_AXIS_KMH, ...hours.map((hour) => hour.windSpeedKmh)),
    10
  );

  const centres = hours.map((_, index) => box.left + slot * (index + 0.5));
  const waveY = (metres: number) => baseline - (metres / waveMaxM) * plotHeight;
  const windY = (kmh: number) => baseline - (kmh / windMaxKmh) * plotHeight;

  const wavePoints = hours.map((hour, index) =>
    point(centres[index] ?? 0, waveY(hour.waveHeightM))
  );
  const windPoints = hours.map((hour, index) =>
    point(centres[index] ?? 0, windY(hour.windSpeedKmh))
  );

  const first = centres[0];
  const last = centres.at(-1);
  const waveArea =
    first === undefined || last === undefined
      ? ''
      : `M${point(first, baseline)} L${wavePoints.join(' L')} L${point(last, baseline)} Z`;

  return {
    bands: hours.map((hour, index) => ({
      x: box.left + slot * index,
      width: slot,
      verdict: hour.verdict,
    })),
    waveLine: wavePoints.length === 0 ? '' : `M${wavePoints.join(' L')}`,
    waveArea,
    windLine: windPoints.length === 0 ? '' : `M${windPoints.join(' L')}`,
    waveMaxM,
    windMaxKmh,
    ticks: hours.flatMap((hour, index) =>
      index % TICK_EVERY_HOURS === 0 ? [{ x: centres[index] ?? 0, time: hour.time }] : []
    ),
    centres,
  };
}

/** The hour whose slot contains `x`, clamped to the chart. */
export function hourIndexAt(x: number, count: number, box: ChartBox): number {
  if (count === 0) return -1;
  const plotWidth = Math.max(box.width - box.left - box.right, 1);
  const index = Math.floor(((x - box.left) / plotWidth) * count);
  return Math.min(Math.max(index, 0), count - 1);
}

/** Longest unbroken run of GO hours, for the chart's spoken summary. */
export function longestGoRun(hours: ChartHour[]): { start: string; end: string } | undefined {
  let best: { from: number; to: number } | undefined;
  let runStart = -1;
  hours.forEach((hour, index) => {
    if (hour.verdict === 'go') {
      if (runStart === -1) runStart = index;
      if (best === undefined || index - runStart > best.to - best.from)
        best = { from: runStart, to: index };
    } else {
      runStart = -1;
    }
  });
  if (best === undefined) return undefined;
  const start = hours[best.from]?.time;
  const end = hours[best.to]?.time;
  return start === undefined || end === undefined ? undefined : { start, end };
}
