/**
 * What the widget layout reads. Layouts cannot see module scope, so colours
 * travel in the props too.
 *
 * This file has no runtime imports on purpose: expo-widgets bundles the
 * layout files for the widget gallery with every package import stubbed out,
 * so anything they load at import time must be self-contained.
 */
export interface VerdictWidgetProps {
  verdict: string;
  irish: string;
  board: string;
  detail: string;
  reason: string;
  footer: string;
  background: string;
  verdictColor: string;
  textColor: string;
  mutedColor: string;
}

/** Shown before the first successful fetch. Hex values are `colors.harbour`, `dawnAmber`, `inkOnDark` and `mutedOnDark`. */
export const PLACEHOLDER_PROPS: VerdictWidgetProps = {
  verdict: 'Tonnta',
  irish: 'Domhnach Bat',
  board: '',
  detail: 'Open the app to read the sea',
  reason: '',
  footer: 'Donabate',
  background: '#0C1B22',
  verdictColor: '#E8A33D',
  textColor: '#E8ECEB',
  mutedColor: '#A9BDBF',
};
