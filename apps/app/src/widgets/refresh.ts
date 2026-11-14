import { Platform } from 'react-native';

import { VerdictWidget } from './verdict-widget';
import { refreshWidgetContent } from './widget-refresh';

export const VERDICT_URL =
  process.env.EXPO_PUBLIC_VERDICT_URL ?? 'https://tonnta-worker.pete-9c4.workers.dev/verdict';

/** iOS receives expiry entries; Android receives non-actionable, timestamped forecast snapshots. */
export async function refreshVerdictWidget(
  now: number | (() => number) = Date.now,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  return refreshWidgetContent(Platform.OS, VerdictWidget, VERDICT_URL, now, fetchImpl);
}
