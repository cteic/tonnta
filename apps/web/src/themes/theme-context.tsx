'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import type { AppTheme, ThemeId } from './registry';
import { DEFAULT_THEME_ID, getTheme, resolveThemeId } from './registry';

const STORAGE_KEY = 'tonnta-theme';

interface ThemeContextValue {
  theme: AppTheme;
  setThemeId: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    setThemeId(resolveThemeId(window.localStorage.getItem(STORAGE_KEY)));
  }, []);

  const theme = getTheme(themeId);

  useEffect(() => {
    document.body.style.background = theme.tokens.bg;
    document.body.style.color = theme.tokens.text;
  }, [theme]);

  function update(id: ThemeId): void {
    setThemeId(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <ThemeContext.Provider value={{ theme, setThemeId: update }}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === undefined) {
    throw new Error('useAppTheme must be used inside ThemeProvider');
  }
  return value;
}
