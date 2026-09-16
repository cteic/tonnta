/**
 * Theme registry — the three redesign directions become selectable looks
 * over one shared skeleton. Components never hard-code colour: they read
 * tokens from the active theme. Heroes are the one per-theme structural
 * element, resolved by the `hero` discriminator in home-view.
 *
 * All four looks ship: `eiri` (default), `cairt`, `postaer`, and `dawn-v1`
 * (the launch look, kept pixel-identical).
 */

export type ThemeId = 'eiri' | 'cairt' | 'postaer' | 'dawn-v1';

export type HeroKind = 'eiri' | 'cairt' | 'postaer' | 'legacy';

export interface SeaTokens {
  go: string;
  maybe: string;
  flat: string;
  blown: string;
}

export interface ThemeTokens {
  /** Page + chrome */
  bg: string;
  nav: string;
  surface: string;
  border: string;
  accentBorder: string;
  /** Text ladder */
  text: string;
  textMuted: string;
  textSoft: string;
  textSubtle: string;
  /** Signal + semantic */
  accent: string;
  accentContrast: string;
  accentSoftBg: string;
  positive: string;
  danger: string;
  dangerBorder: string;
  dangerBg: string;
  /** Toggle */
  toggleActiveBg: string;
  toggleActiveText: string;
  /** Sea-state ladder (bands + day-strip swatches) */
  sea: SeaTokens;
  /** Static hero wash used by legacy + Snámh heroes */
  heroGradient: string;
  /** Card chrome overrides — poster themes print heavier borders. */
  cardBorderPx?: number;
  cardRadiusPx?: number;
}

export interface AppTheme {
  id: ThemeId;
  name: string;
  irishName: string;
  description: string;
  swatch: [string, string, string];
  hero: HeroKind;
  tokens: ThemeTokens;
}

/** The launch palette, unchanged — components migrated to tokens must render
 *  exactly these values under dawn-v1. */
const DAWN_V1_TOKENS: ThemeTokens = {
  bg: '#0C1B22',
  nav: '#0C1B22',
  surface: '#122630',
  border: '#22404C',
  accentBorder: 'rgba(232,163,61,0.4)',
  text: '#E8ECEB',
  textMuted: '#C6D2D2',
  textSoft: '#A9BDBF',
  textSubtle: '#6E8A90',
  accent: '#E8A33D',
  accentContrast: '#0C1B22',
  accentSoftBg: 'rgba(232,163,61,0.14)',
  positive: '#8FC1B5',
  danger: '#C4553B',
  dangerBorder: 'rgba(196,85,59,0.5)',
  dangerBg: 'rgba(196,85,59,0.12)',
  toggleActiveBg: '#E8ECEB',
  toggleActiveText: '#0C1B22',
  sea: { go: '#5E9A8C', maybe: '#557D86', flat: '#9FB8B3', blown: '#4A5A61' },
  heroGradient: 'linear-gradient(180deg, #0C1B22 0%, #0E2129 60%, #16323B 100%)',
};

/** Éirí chrome sits slightly deeper and warmer than dawn-v1 so the sky owns
 *  the light; the hero itself is painted live by the solar engine. */
const EIRI_TOKENS: ThemeTokens = {
  ...DAWN_V1_TOKENS,
  bg: '#0B161E',
  nav: '#0B161E',
  surface: '#10222B',
  border: '#1F3A46',
  text: '#F2EDE4',
  textMuted: '#D5D5C9',
  textSoft: '#AEC0BD',
  heroGradient: 'linear-gradient(180deg, #10142E 0%, #16323B 55%, #1D3D44 100%)',
};

/** An Cairt: Admiralty-chart instrument. Light chart paper, sounding ink,
 *  hairline rules; notice magenta is spent only on GO and alerts. */
const CAIRT_TOKENS: ThemeTokens = {
  bg: '#EEF2EC',
  nav: '#EEF2EC',
  surface: 'rgba(255,255,255,0.72)',
  border: '#B9C9C2',
  accentBorder: '#B8266B',
  text: '#12333E',
  textMuted: '#2E5561',
  textSoft: '#4D7280',
  textSubtle: '#5F7E89',
  accent: '#B8266B',
  accentContrast: '#FFFFFF',
  accentSoftBg: 'rgba(184,38,107,0.08)',
  positive: '#2E7D6B',
  danger: '#B3401F',
  dangerBorder: 'rgba(179,64,31,0.5)',
  dangerBg: 'rgba(179,64,31,0.07)',
  toggleActiveBg: '#12333E',
  toggleActiveText: '#EEF2EC',
  sea: { go: '#4D7280', maybe: '#9DB8C2', flat: '#B4C6C1', blown: '#77898E' },
  heroGradient: 'linear-gradient(180deg, #EEF2EC 0%, #E4EBE4 100%)',
};

/** Screen-print inks on poster stock — cards read as printed paper panels. */
const POSTAER_TOKENS: ThemeTokens = {
  bg: '#F4E9D3',
  nav: '#F4E9D3',
  surface: '#F9F1E1',
  border: '#1E4D46',
  accentBorder: '#E2593B',
  text: '#1E4D46',
  textMuted: '#2E5A52',
  textSoft: '#4A7268',
  textSubtle: '#6B8B80',
  accent: '#E2593B',
  accentContrast: '#F4E9D3',
  accentSoftBg: 'rgba(226, 89, 59, 0.14)',
  positive: '#3E8477',
  danger: '#B3401F',
  dangerBorder: 'rgba(179, 64, 31, 0.55)',
  dangerBg: 'rgba(179, 64, 31, 0.1)',
  toggleActiveBg: '#1E4D46',
  toggleActiveText: '#F4E9D3',
  sea: { go: '#3E8477', maybe: '#7FB5A4', flat: '#C7D6C4', blown: '#5B7268' },
  heroGradient: 'linear-gradient(180deg, #F4E9D3 0%, #F4E9D3 55%, #7FB5A4 100%)',
  cardBorderPx: 2,
  cardRadiusPx: 10,
};

export const THEMES: readonly AppTheme[] = [
  {
    id: 'eiri',
    name: 'Éirí',
    irishName: 'Éirí',
    description: 'The dawn window — the sky in the app is the sky outside, minute by minute.',
    swatch: ['#10142E', '#E8A33D', '#12333A'],
    hero: 'eiri',
    tokens: EIRI_TOKENS,
  },
  {
    id: 'cairt',
    name: 'An Cairt',
    irishName: 'An Cairt',
    description: "The harbourmaster's chart — soundings, contours and a stamped verdict.",
    swatch: ['#EEF2EC', '#12333E', '#B8266B'],
    hero: 'cairt',
    tokens: CAIRT_TOKENS,
  },
  {
    id: 'postaer',
    name: 'An Postaer',
    irishName: 'An Postaer',
    description: 'The seaside travel poster — four inks, one sun, today as a print.',
    swatch: ['#F4E9D3', '#E2593B', '#1E4D46'],
    hero: 'postaer',
    tokens: POSTAER_TOKENS,
  },
  {
    id: 'dawn-v1',
    name: 'Dawn patrol',
    irishName: 'Camchuairt na maidine',
    description: 'The launch look — harbour ink and the living sea bands.',
    swatch: ['#0C1B22', '#8FC1B5', '#E8A33D'],
    hero: 'legacy',
    tokens: DAWN_V1_TOKENS,
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'eiri';

export function resolveThemeId(stored: unknown): ThemeId {
  if (typeof stored === 'string') {
    const match = THEMES.find((theme) => theme.id === stored);
    if (match !== undefined) {
      return match.id;
    }
  }
  return DEFAULT_THEME_ID;
}

export function getTheme(id: ThemeId): AppTheme {
  const match = THEMES.find((theme) => theme.id === id);
  if (match !== undefined) {
    return match;
  }
  const fallback = THEMES[0];
  if (fallback === undefined) {
    throw new Error('Theme registry is empty');
  }
  return fallback;
}
