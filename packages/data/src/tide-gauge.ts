import type { TideGaugeReading, TideTrend } from '@tonnta/types';

/**
 * Change in level over the trend window below which the tide counts as slack.
 * Around high and low water the gauge moves a centimetre or two in 15 minutes.
 */
export const SLACK_THRESHOLD_M = 0.03;

const TREND_WINDOW_MS = 15 * 60 * 1000;

/** Rising, falling or slack, from the latest reading against the one about 15 minutes earlier. */
export function tideTrend(readings: TideGaugeReading[]): TideTrend | undefined {
  const latest = readings.at(-1);
  if (latest === undefined) return undefined;
  const latestMs = Date.parse(latest.time);
  const earlier = readings
    .filter((reading) => latestMs - Date.parse(reading.time) >= TREND_WINDOW_MS)
    .at(-1);
  if (earlier === undefined) return undefined;
  const change = latest.levelM - earlier.levelM;
  if (Math.abs(change) < SLACK_THRESHOLD_M) return 'slack';
  return change > 0 ? 'rising' : 'falling';
}

/** Readings strictly newer than `afterTime`, so a stream only sends what a client has not seen. */
export function readingsAfter(
  readings: TideGaugeReading[],
  afterTime: string | undefined
): TideGaugeReading[] {
  if (afterTime === undefined) return readings;
  return readings.filter((reading) => reading.time > afterTime);
}
