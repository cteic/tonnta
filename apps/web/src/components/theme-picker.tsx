'use client';

import { useEffect, useRef, useState } from 'react';

import { THEMES } from '@/themes/registry';
import { useAppTheme } from '@/themes/theme-context';

/**
 * Cuma — the look picker. A small nav affordance opening an inline panel;
 * choosing a theme applies instantly and persists per device.
 */
export function ThemePicker() {
  const { theme, setThemeId } = useAppTheme();
  const { tokens } = theme;
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen((current) => !current);
        }}
        style={{
          padding: '6px 14px',
          borderRadius: 999,
          border: `1px solid ${tokens.border}`,
          background: open ? tokens.toggleActiveBg : tokens.surface,
          color: open ? tokens.toggleActiveText : tokens.textSoft,
          fontFamily: "'General Sans', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Cuma
      </button>
      {open ? (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Choose a look"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            zIndex: 20,
            width: 264,
            display: 'grid',
            gap: 6,
            padding: 10,
            borderRadius: 16,
            background: tokens.surface,
            border: `1px solid ${tokens.border}`,
            boxShadow: '0 18px 44px rgba(4, 12, 16, 0.5)',
          }}
        >
          {THEMES.map((option) => {
            const active = option.id === theme.id;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setThemeId(option.id);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: 12,
                  border: `1px solid ${active ? tokens.accentBorder : 'transparent'}`,
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span aria-hidden style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
                  {option.swatch.map((colour) => (
                    <i
                      key={colour}
                      style={{
                        width: 12,
                        height: 22,
                        borderRadius: 3,
                        background: colour,
                        display: 'inline-block',
                      }}
                    />
                  ))}
                </span>
                <span>
                  <b
                    style={{
                      display: 'block',
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: tokens.text,
                    }}
                  >
                    {option.name}
                  </b>
                  <span style={{ display: 'block', fontSize: 11.5, color: tokens.textSubtle }}>
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
