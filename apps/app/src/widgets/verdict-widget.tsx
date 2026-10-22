import type { WidgetTimelineEntry } from './verdict-timeline';
import type { VerdictWidgetProps } from './verdict-widget-props';

/**
 * Web has no home-screen widget. This stub keeps the shared refresh code
 * platform-neutral; Metro picks the `.ios` and `.android` files on device.
 */
export const VerdictWidget = {
  updateSnapshot(_props: VerdictWidgetProps): void {},
  updateTimeline(_entries: WidgetTimelineEntry[]): void {},
  reload(): void {},
};

export default VerdictWidget;
