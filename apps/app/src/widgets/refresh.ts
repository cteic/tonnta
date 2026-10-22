import { Platform } from 'react-native';

import { currentEntry, fetchVerdictTimeline, toTimelineEntries } from './verdict-timeline';
import { VerdictWidget } from './verdict-widget';

/** The worker's verdict timeline. Override to point a dev build at `wrangler dev`. */
export const VERDICT_URL =
  process.env.EXPO_PUBLIC_VERDICT_URL ?? 'https://tonnta-worker.pete-9c4.workers.dev/verdict';

/**
 * Fetch the day's verdicts and hand them to the home-screen widget. iOS gets
 * every hour as a timeline, so the widget stays right while the app sleeps;
 * Android has no timeline API and gets the current hour.
 *
 * Resolves false on any failure and leaves the widget showing what it had.
 */
export async function refreshVerdictWidget(
  now: number = Date.now(),
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  try {
    const entries = toTimelineEntries(await fetchVerdictTimeline(VERDICT_URL, fetchImpl));
    if (Platform.OS === 'ios') {
      if (entries.length === 0) return false;
      VerdictWidget.updateTimeline(entries);
      return true;
    }
    const entry = currentEntry(entries, now);
    if (entry === undefined) return false;
    VerdictWidget.updateSnapshot(entry.props);
    return true;
  } catch {
    return false;
  }
}
