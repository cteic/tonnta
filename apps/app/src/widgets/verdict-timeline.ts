import { getSpot, isRecord } from '@tonnta/data';
import type { Board, Verdict } from '@tonnta/types';
import { colors } from '@tonnta/ui/theme';

import { BOARD_LABEL, VERDICT_LABEL, formatHour } from '../lib/format';
import type { VerdictWidgetProps } from './verdict-widget-props';

/**
 * The worker's `GET /verdict` payload and what the home-screen widget shows
 * for each hour of it. Kept free of native modules so it runs under vitest.
 */

export interface HourVerdict {
  time: string;
  verdict: Verdict;
  board?: Board;
  reason: string;
  waveHeightM: number;
  wavePeriodS: number;
  windSpeedKmh: number;
}

export interface VerdictTimeline {
  spot: { id: string; name: string; irishName?: string };
  generatedAt: string;
  hours: HourVerdict[];
}

export interface WidgetTimelineEntry {
  date: Date;
  props: VerdictWidgetProps;
}

const VERDICTS: readonly string[] = ['go', 'maybe', 'flat', 'blown'];
const BOARDS: readonly string[] = ['sup', 'foamie', 'longboard'];

function isHourVerdict(value: unknown): value is HourVerdict {
  return (
    isRecord(value) &&
    typeof value.time === 'string' &&
    typeof value.verdict === 'string' &&
    VERDICTS.includes(value.verdict) &&
    (value.board === undefined ||
      (typeof value.board === 'string' && BOARDS.includes(value.board))) &&
    typeof value.reason === 'string' &&
    typeof value.waveHeightM === 'number' &&
    typeof value.wavePeriodS === 'number' &&
    typeof value.windSpeedKmh === 'number'
  );
}

export function isVerdictTimeline(value: unknown): value is VerdictTimeline {
  return (
    isRecord(value) &&
    isRecord(value.spot) &&
    typeof value.spot.id === 'string' &&
    typeof value.spot.name === 'string' &&
    typeof value.generatedAt === 'string' &&
    Array.isArray(value.hours) &&
    value.hours.every(isHourVerdict)
  );
}

/** The sea colour per verdict, matching the home screen's verdict card. */
const VERDICT_BACKGROUND: Record<Verdict, string> = {
  go: colors.seaClean,
  maybe: colors.seaMarginal,
  flat: colors.seaFlat,
  blown: colors.seaBlown,
};

export function toWidgetProps(
  hour: HourVerdict,
  spotName: string,
  timezone: string
): VerdictWidgetProps {
  const label = VERDICT_LABEL[hour.verdict];
  // Flat is the one pale sea; it takes ink text instead of fog.
  const onPale = hour.verdict === 'flat';
  const textColor = onPale ? colors.inkOnLight : colors.inkOnDark;
  return {
    verdict: label.english,
    irish: label.irish,
    board: hour.board === undefined ? '' : `${BOARD_LABEL[hour.board]} day`,
    detail: `${hour.waveHeightM.toFixed(1)}m @ ${Math.round(hour.wavePeriodS)}s · ${Math.round(hour.windSpeedKmh)}km/h`,
    reason: hour.reason,
    footer: `${spotName} · ${formatHour(hour.time, timezone)}`,
    background: VERDICT_BACKGROUND[hour.verdict],
    verdictColor: hour.verdict === 'go' ? colors.dawnAmber : textColor,
    textColor,
    mutedColor: onPale ? colors.mutedOnLight : colors.mutedOnDark,
  };
}

const FALLBACK_TIMEZONE = 'Europe/Dublin';

/** One entry per forecast hour, dated at the start of that hour. */
export function toTimelineEntries(timeline: VerdictTimeline): WidgetTimelineEntry[] {
  const timezone = getSpot(timeline.spot.id)?.timezone ?? FALLBACK_TIMEZONE;
  return timeline.hours.map((hour) => ({
    date: new Date(hour.time),
    props: toWidgetProps(hour, timeline.spot.name, timezone),
  }));
}

/** The entry for the hour containing `now`, or the first one if the timeline starts later. */
export function currentEntry(
  entries: WidgetTimelineEntry[],
  now: number
): WidgetTimelineEntry | undefined {
  const started = entries.filter((entry) => entry.date.getTime() <= now);
  return started.at(-1) ?? entries[0];
}

/** A stalled request must not hold the background task past its OS budget. */
export const FETCH_TIMEOUT_MS = 15_000;

export async function fetchVerdictTimeline(
  url: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<VerdictTimeline> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // The timer covers the body as well as the headers: a server can send
  // headers and then stall, which would hang the background task as surely.
  let body: unknown;
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Verdict endpoint: HTTP ${response.status}`);
    }
    body = await response.json();
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Verdict endpoint: no response within ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
  if (!isVerdictTimeline(body)) {
    throw new Error('Verdict endpoint: unexpected response shape');
  }
  return body;
}
