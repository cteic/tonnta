import type { WindState } from '@tonnta/types';

/**
 * An Postaer — the pure scene math.
 *
 * Everything the poster draws (hero and 1080×1920 export alike) is computed
 * here so the layout is testable without a canvas: one set of screen-print
 * inks, wave-band geometry from real wave height, drift timing from the
 * wind, and the headline, which is the wave height itself.
 */

export interface PosterInks {
  stock: string;
  sun: string;
  deep: string;
  mid: string;
  shallow: string;
  headline: string;
  subline: string;
}

/** Four screen-print inks on poster stock. The same inks every day: the
 *  poster shows the sea, it does not judge it. */
export function posterInks(): PosterInks {
  return {
    stock: '#F4E9D3',
    sun: '#E2593B',
    deep: '#1E4D46',
    mid: '#3E8477',
    shallow: '#7FB5A4',
    headline: '#1E4D46',
    subline: '#B3401F',
  };
}

export interface BandSpec {
  /** 0–1 fraction of scene height measured from the bottom to the band crest. */
  crest: number;
  ink: 'shallow' | 'mid' | 'deep' | 'deepest';
  /** Seconds for one gentle bob cycle. */
  bobS: number;
}

const BAND_BASE_CRESTS = [0.34, 0.26, 0.17, 0.08] as const;
const BAND_INKS = ['shallow', 'mid', 'deep', 'deepest'] as const;

/** Clamp wave height into the poster's expressive range. */
export function bandLift(waveHeightM: number): number {
  const clamped = Math.max(0, Math.min(1.5, waveHeightM));
  // 0m → bands sit low and calm; 1.5m → crests lift by up to 9% of height
  return (clamped / 1.5) * 0.09;
}

export function driftDuration(windState: WindState): number {
  if (windState === 'glassy') return 9;
  if (windState === 'onshore' || windState === 'cross-on') return 3.5;
  return 6;
}

export function bandLayout(waveHeightM: number, windState: WindState): BandSpec[] {
  const lift = bandLift(waveHeightM);
  const bob = driftDuration(windState);
  return BAND_BASE_CRESTS.map((base, index) => {
    const ink = BAND_INKS[index] ?? 'deepest';
    return {
      crest: base + lift * (1 - index * 0.18),
      ink,
      bobS: bob * (1 + index * 0.35),
    };
  });
}

/** Layout for the 1080×1920 exported poster, in canvas pixels. */
export interface PosterLayout {
  width: number;
  height: number;
  sun: { cx: number; cy: number; r: number };
  headline: { text: string; y: number; sizePx: number };
  subline: { text: string; y: number };
  factsY: number;
  bands: { yTop: number; ink: BandSpec['ink'] }[];
  stamp: { text: string; y: number };
}

export interface PosterInput {
  /** The headline: the wave height, for example "0.8m". */
  headline: string;
  /** The board tag line, for example "Board: Foamie". */
  boardLabel?: string | undefined;
  /** Plain facts: period, wind, gusts, sea temperature. */
  factsLine: string;
  waveHeightM: number;
  windState: WindState;
  dateLabel: string;
  spotLine: string;
}

const EXPORT_W = 1080;
const EXPORT_H = 1920;

export function posterLayout(input: PosterInput): PosterLayout {
  const headlineText = input.headline.toUpperCase();
  // Longer headlines set smaller so they never crowd the margins.
  const sizePx = headlineText.length > 7 ? 168 : 232;
  const bands = bandLayout(input.waveHeightM, input.windState).map((band) => ({
    yTop: Math.round(EXPORT_H * (1 - band.crest)),
    ink: band.ink,
  }));
  return {
    width: EXPORT_W,
    height: EXPORT_H,
    sun: { cx: EXPORT_W / 2, cy: 560, r: 240 },
    headline: { text: headlineText, y: 1010, sizePx },
    subline: {
      text: (input.boardLabel ?? '').toUpperCase(),
      y: 1094,
    },
    factsY: 1170,
    bands,
    stamp: { text: `${input.dateLabel} · ${input.spotLine} · TONNTA.SURF`, y: EXPORT_H - 64 },
  };
}
