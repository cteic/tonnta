'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { SPOTS } from '@tonnta/data';

import { useAppTheme } from '@/themes/theme-context';

/**
 * Spot switcher — a small nav affordance opening a panel of spots grouped
 * by region. Donabate lives at `/`; every other spot at `/s/<id>`.
 */
export function SpotSwitcher({ activeSpotId }: { activeSpotId: string }) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { tokens } = theme;
  const [open, setOpen] = useState(false);

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

  const regions = [...new Set(SPOTS.map((spot) => spot.region))];

  function go(spotId: string): void {
    setOpen(false);
    router.push(spotId === 'donabate' ? '/' : `/s/${spotId}`);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Change spot"
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
        Trá
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Choose a spot"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            zIndex: 20,
            width: 248,
            display: 'grid',
            gap: 4,
            padding: 10,
            borderRadius: 16,
            background: tokens.surface,
            border: `1px solid ${tokens.border}`,
            boxShadow: '0 18px 44px rgba(4, 12, 16, 0.5)',
          }}
        >
          {regions.map((region) => (
            <div key={region} style={{ display: 'grid', gap: 4 }}>
              <p
                style={{
                  margin: '4px 6px 0',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: tokens.textSubtle,
                }}
              >
                {region}
              </p>
              {SPOTS.filter((spot) => spot.region === region).map((spot) => {
                const active = spot.id === activeSpotId;
                return (
                  <button
                    key={spot.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    onClick={() => {
                      go(spot.id);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: 'none',
                      background: active ? tokens.toggleActiveBg : 'transparent',
                      color: active ? tokens.toggleActiveText : tokens.text,
                      fontFamily: "'General Sans', sans-serif",
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {spot.name}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
