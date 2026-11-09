import {
  MAX_FORECAST_AGE_MS,
  getSpot,
  isDaylightHour,
  isForecastFresh,
  isRecord,
} from '@tonnta/data';
import type { Board, Verdict } from '@tonnta/types';
import { colors } from '@tonnta/ui/theme';

import {
  BOARD_LABEL,
  VERDICT_LABEL,
  formatDayName,
  formatHour,
  formatHourRange,
} from '../lib/format';
import type { VerdictWidgetProps } from './verdict-widget-props';

/** v2 adds explicit darkness and validity. v1 remains readable during rollout. */
export interface HourVerdict {
  time: string;
  verdict: Verdict | 'dark';
  daylight?: boolean;
  validUntil?: string;
  board?: Board;
  reason: string;
  waveHeightM: number;
  wavePeriodS: number;
  windSpeedKmh: number;
}

export interface VerdictTimeline {
  schemaVersion?: 2;
  spot: { id: string; name: string; irishName?: string };
  generatedAt: string;
  hours: HourVerdict[];
}

export interface WidgetTimelineEntry {
  date: Date;
  props: VerdictWidgetProps;
}

const HOUR_MS = 3_600_000;
const VERDICTS: readonly string[] = ['go', 'maybe', 'flat', 'blown', 'dark'];
const BOARDS: readonly string[] = ['sup', 'foamie', 'longboard'];

function isTime(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function nonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isHourVerdict(value: unknown): value is HourVerdict {
  if (!isRecord(value) || !isTime(value.time)) return false;
  const start = Date.parse(value.time);
  return (
    typeof value.verdict === 'string' &&
    VERDICTS.includes(value.verdict) &&
    (value.daylight === undefined || typeof value.daylight === 'boolean') &&
    (value.validUntil === undefined ||
      (isTime(value.validUntil) &&
        Date.parse(value.validUntil) > start &&
        Date.parse(value.validUntil) <= start + HOUR_MS)) &&
    (value.board === undefined ||
      (typeof value.board === 'string' && BOARDS.includes(value.board))) &&
    typeof value.reason === 'string' &&
    nonNegative(value.waveHeightM) &&
    nonNegative(value.wavePeriodS) &&
    nonNegative(value.windSpeedKmh)
  );
}

export function isVerdictTimeline(value: unknown): value is VerdictTimeline {
  if (!(
    isRecord(value) &&
    (value.schemaVersion === undefined || value.schemaVersion === 2) &&
    isRecord(value.spot) &&
    typeof value.spot.id === 'string' &&
    typeof value.spot.name === 'string' &&
    isTime(value.generatedAt)
  ))
    return false;
  const hours: unknown = value.hours;
  if (!Array.isArray(hours) || !hours.every(isHourVerdict)) return false;
  return hours.every((hour, index) => {
    const previous = hours[index - 1];
    if (previous !== undefined && Date.parse(hour.time) <= Date.parse(previous.time)) return false;
    if (value.schemaVersion === 2) {
      return (
        typeof hour.daylight === 'boolean' &&
        hour.validUntil !== undefined &&
        (hour.verdict === 'dark' ? !hour.daylight && hour.board === undefined : hour.daylight)
      );
    }
    return true;
  });
}

const VERDICT_BACKGROUND: Record<Verdict, string> = {
  go: colors.seaClean,
  maybe: colors.seaMarginal,
  flat: colors.seaFlat,
  blown: colors.seaBlown,
};
const FALLBACK_TIMEZONE = 'Europe/Dublin';

export function unavailableWidgetProps(spotName = 'Tonnta'): VerdictWidgetProps {
  return {
    status: 'unavailable',
    verdict: 'Update needed',
    irish: '',
    board: '',
    detail: 'Open Tonnta for current advice',
    reason: 'Conditions are unavailable or need a fresh check.',
    footer: spotName,
    background: colors.seaNight,
    verdictColor: colors.inkOnDark,
    textColor: colors.inkOnDark,
    mutedColor: colors.mutedOnDark,
  };
}

function hourFooter(hour: HourVerdict, spotName: string, timezone: string): string {
  const range =
    hour.validUntil === undefined
      ? formatHourRange(hour.time, hour.time, timezone)
      : `${formatHour(hour.time, timezone)}–${formatHour(hour.validUntil, timezone)}`;
  return `${spotName} · ${formatDayName(hour.time, timezone)} ${range}`;
}

function darkWidgetProps(
  hour: HourVerdict,
  spotName: string,
  timezone: string
): VerdictWidgetProps {
  return {
    ...unavailableWidgetProps(spotName),
    status: 'dark',
    verdict: 'Out of the water',
    detail: 'Daylight hours only',
    reason: 'This forecast hour is not wholly between sunrise and sunset.',
    footer: hourFooter(hour, spotName, timezone),
  };
}

export function toWidgetProps(
  hour: HourVerdict,
  spotName: string,
  timezone: string
): VerdictWidgetProps {
  if (hour.verdict === 'dark') return darkWidgetProps(hour, spotName, timezone);
  const label = VERDICT_LABEL[hour.verdict];
  const onPale = hour.verdict === 'flat';
  const textColor = onPale ? colors.inkOnLight : colors.inkOnDark;
  return {
    status: 'forecast',
    verdict: label.english,
    irish: label.irish,
    board: hour.board === undefined ? '' : `${BOARD_LABEL[hour.board]} day`,
    detail: `${hour.waveHeightM.toFixed(1)}m @ ${Math.round(hour.wavePeriodS)}s · ${Math.round(hour.windSpeedKmh)}km/h`,
    reason: hour.reason,
    footer: hourFooter(hour, spotName, timezone),
    background: VERDICT_BACKGROUND[hour.verdict],
    verdictColor: hour.verdict === 'go' ? colors.dawnAmber : textColor,
    textColor,
    mutedColor: onPale ? colors.mutedOnLight : colors.mutedOnDark,
  };
}

/**
 * A bounded iOS timeline. Gaps and the end always get an unavailable entry,
 * and source freshness expires after one hour even if the forecast spans days.
 * `now` is explicit at refresh; its default keeps this projection deterministic.
 */
export function toTimelineEntries(
  timeline: VerdictTimeline,
  now = Date.parse(timeline.generatedAt)
): WidgetTimelineEntry[] {
  if (!Number.isFinite(now)) return [];
  const unavailable = unavailableWidgetProps(timeline.spot.name);
  const fallback = [{ date: new Date(now), props: unavailable }];
  if (!isVerdictTimeline(timeline) || !isForecastFresh(Date.parse(timeline.generatedAt), now))
    return fallback;
  const spot = getSpot(timeline.spot.id);
  if (spot === undefined) return fallback;
  const timezone = spot.timezone ?? FALLBACK_TIMEZONE;
  const expires = Date.parse(timeline.generatedAt) + MAX_FORECAST_AGE_MS;
  const entries = new Map<number, VerdictWidgetProps>();
  entries.set(now, unavailable);
  for (const hour of timeline.hours) {
    const start = Date.parse(hour.time);
    const end = Math.min(
      start + HOUR_MS,
      expires,
      hour.validUntil === undefined ? Infinity : Date.parse(hour.validUntil)
    );
    if (end <= now || start >= expires) continue;
    const date = Math.max(start, now);
    const clipped = { ...hour, validUntil: new Date(end).toISOString() };
    const daylight =
      isDaylightHour(hour.time, spot) && hour.daylight !== false && hour.verdict !== 'dark';
    entries.set(
      date,
      daylight
        ? toWidgetProps(clipped, timeline.spot.name, timezone)
        : darkWidgetProps(clipped, timeline.spot.name, timezone)
    );
    entries.set(end, unavailable);
  }
  return [...entries.entries()]
    .sort(([a], [b]) => a - b)
    .map(([date, props]) => ({ date: new Date(date), props }));
}

/** Never substitute a future entry for current conditions. */
export function currentEntry(
  entries: WidgetTimelineEntry[],
  now: number
): WidgetTimelineEntry | undefined {
  return entries.filter((entry) => entry.date.getTime() <= now).at(-1);
}

/** Android snapshots cannot schedule expiry, so never contain actionable verdicts or board calls. */
export function toAndroidSnapshot(timeline: VerdictTimeline, now: number): VerdictWidgetProps {
  const entry = currentEntry(toTimelineEntries(timeline, now), now);
  if (entry === undefined || entry.props.status === 'unavailable')
    return unavailableWidgetProps(timeline.spot.name);
  return {
    ...entry.props,
    verdict: 'Open Tonnta',
    irish: 'Forecast only',
    board: '',
    reason: 'Check the app before entering the water.',
    background: colors.seaNight,
    verdictColor: colors.inkOnDark,
    textColor: colors.inkOnDark,
    mutedColor: colors.mutedOnDark,
  };
}

export const FETCH_TIMEOUT_MS = 15_000;

export async function fetchVerdictTimeline(
  url: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<VerdictTimeline> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Verdict endpoint: no response within ${timeoutMs}ms`));
    }, timeoutMs);
  });
  const read = async () => {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Verdict endpoint: HTTP ${response.status}`);
    const body: unknown = await response.json();
    if (!isVerdictTimeline(body)) throw new Error('Verdict endpoint: unexpected response shape');
    return body;
  };
  try {
    return await Promise.race([read(), deadline]);
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(`Verdict endpoint: no response within ${timeoutMs}ms`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
