import {
  currentEntry,
  fetchVerdictTimeline,
  toAndroidSnapshot,
  toTimelineEntries,
  unavailableWidgetProps,
} from './verdict-timeline';
import type { WidgetTimelineEntry } from './verdict-timeline';
import type { VerdictWidgetProps } from './verdict-widget-props';

export interface WidgetSink {
  updateTimeline(entries: WidgetTimelineEntry[]): void;
  updateSnapshot(props: VerdictWidgetProps): void;
}

/** Pure orchestration seam: fetch failure must clear old recommendations, not retain them. */
export async function refreshWidgetContent(
  platform: string,
  sink: WidgetSink,
  url: string,
  now: number | (() => number),
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  const clock = typeof now === 'function' ? now : () => now;
  const clear = () => {
    const props = unavailableWidgetProps();
    if (platform === 'ios') sink.updateTimeline([{ date: new Date(clock()), props }]);
    else sink.updateSnapshot(props);
  };
  try {
    // Remove any previous-version or expired recommendation before waiting on the network.
    clear();
    const timeline = await fetchVerdictTimeline(url, fetchImpl);
    const completedAt = clock();
    const entries = toTimelineEntries(timeline, completedAt);
    const current = currentEntry(entries, completedAt);
    if (current === undefined || current.props.status === 'unavailable') {
      clear();
      return false;
    }
    if (platform === 'ios') sink.updateTimeline(entries);
    else sink.updateSnapshot(toAndroidSnapshot(timeline, completedAt));
    return true;
  } catch {
    try {
      clear();
    } catch {
      /* A native write failure is surfaced as false; no success is claimed. */
    }
    return false;
  }
}
