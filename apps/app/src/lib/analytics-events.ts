import type { ChartHour, SpotOutlook } from './conditions';

/**
 * Every event the app sends, with its properties, and the functions that
 * build them. Kept free of the SDK so the shapes are tested on their own.
 */
export interface AnalyticsEvents {
  outlook_viewed: { spot: string; verdict: string; board: string | null };
  chart_scrubbed: { spot: string; hours_ahead: number; verdict: string };
}

export function outlookViewed(outlook: SpotOutlook): AnalyticsEvents['outlook_viewed'] {
  return { spot: outlook.spot.id, verdict: outlook.now.verdict, board: outlook.now.board ?? null };
}

export function chartScrubbed(
  spotId: string,
  hours: ChartHour[],
  index: number
): AnalyticsEvents['chart_scrubbed'] | undefined {
  const hour = hours[index];
  if (hour === undefined) return undefined;
  return { spot: spotId, hours_ahead: index, verdict: hour.verdict };
}
