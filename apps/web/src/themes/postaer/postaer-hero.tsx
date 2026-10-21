'use client';

import { useState } from 'react';

import type { HourlyConditions, Spot, VerdictResult } from '@tonnta/types';

import { BOARD_LABEL } from '@/lib/format';

import { sharePoster } from './poster-export';
import type { PosterInput } from './poster-scene';
import { POSTER_HEADLINE, bandLayout, posterInks } from './poster-scene';

/**
 * An Postaer — the day as a mid-century Irish seaside travel poster.
 * Flat screen-print shapes only; the conditions set the band heights, the
 * bob tempo and the inks. The share action exports the same scene at story
 * size — every good day is a poster someone can send.
 */

interface PostaerHeroProps {
  spot: Spot;
  verdict: VerdictResult;
  hour?: HourlyConditions | undefined;
}

function dateLabel(timezone: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(new Date())
    .replaceAll('/', '.');
}

const CAPS: React.CSSProperties = {
  fontWeight: 700,
  textTransform: 'uppercase',
  fontFamily: "'Futura', 'Avenir Next', 'General Sans', sans-serif",
};

export function PostaerHero({ spot, verdict, hour }: PostaerHeroProps) {
  const [shareState, setShareState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  const inks = posterInks(verdict.verdict);
  const bands = bandLayout(hour?.waveHeightM ?? 0.2, hour?.windState ?? 'glassy');
  const headline = POSTER_HEADLINE[verdict.verdict];
  const boardLabel = verdict.board !== undefined ? `${BOARD_LABEL[verdict.board]} day` : undefined;
  const spotLine = (spot.irishName ?? spot.name).toUpperCase();
  const bandInk = (key: (typeof bands)[number]['ink']): string => {
    if (key === 'shallow') return inks.shallow;
    if (key === 'mid') return inks.mid;
    if (key === 'deep') return inks.deep;
    return '#143733';
  };

  async function onShare(): Promise<void> {
    if (hour === undefined) return;
    setShareState('busy');
    const input: PosterInput = {
      verdict: verdict.verdict,
      boardLabel,
      reason: verdict.reason,
      waveHeightM: hour.waveHeightM,
      windState: hour.windState,
      dateLabel: dateLabel(spot.timezone),
      spotLine,
    };
    try {
      const outcome = await sharePoster(input);
      setShareState(outcome === 'cancelled' ? 'idle' : 'done');
    } catch {
      setShareState('failed');
    }
  }

  return (
    <header
      style={{
        position: 'relative',
        background: inks.stock,
        color: inks.deep,
        overflow: 'hidden',
        minHeight: 560,
      }}
    >
      {/* Sun disc */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 64,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 168,
          height: 168,
          borderRadius: '50%',
          background: inks.sun,
        }}
      />

      {/* Wave bands, printed back to front */}
      <div aria-hidden style={{ position: 'absolute', inset: 0 }}>
        {bands.map((band, index) => (
          <div
            key={index}
            data-tonnta-animated
            style={{
              position: 'absolute',
              left: '-8%',
              right: '-8%',
              top: `${(1 - band.crest) * 100}%`,
              bottom: 0,
              background: bandInk(band.ink),
              borderRadius: '50% 50% 0 0 / 90px 90px 0 0',
              animation: `tonntaBob ${band.bobS}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      {/* Rain hatching on blown days */}
      {verdict.verdict === 'blown' ? (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'repeating-linear-gradient(65deg, rgba(61,80,73,0.18) 0 3px, transparent 3px 26px)',
          }}
        />
      ) : null}

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: 720,
          margin: '0 auto',
          padding: '190px 24px 0',
          textAlign: 'center',
        }}
      >
        <h1
          className="tonnta-surface-in"
          style={{
            margin: 0,
            fontFamily: "'Clash Display', sans-serif",
            fontWeight: 700,
            fontSize: headline.length > 7 ? 'clamp(44px, 12vw, 76px)' : 'clamp(64px, 18vw, 104px)',
            lineHeight: 0.92,
            letterSpacing: '-0.01em',
            color: inks.headline,
          }}
        >
          {headline}
        </h1>
        {boardLabel !== undefined ? (
          <p
            style={{
              ...CAPS,
              margin: '14px 0 0',
              fontSize: 13,
              letterSpacing: '0.34em',
              color: inks.subline,
            }}
          >
            {boardLabel}
          </p>
        ) : null}
        <p
          style={{
            margin: '12px auto 0',
            maxWidth: '30ch',
            fontSize: 14,
            lineHeight: 1.5,
            color: inks.headline,
          }}
        >
          {verdict.reason}
        </p>
        <button
          type="button"
          onClick={() => {
            void onShare();
          }}
          disabled={shareState === 'busy' || hour === undefined}
          style={{
            ...CAPS,
            marginTop: 18,
            fontSize: 11,
            letterSpacing: '0.18em',
            padding: '10px 18px',
            borderRadius: 999,
            border: `2px solid ${inks.deep}`,
            background: shareState === 'done' ? inks.deep : 'transparent',
            color: shareState === 'done' ? inks.stock : inks.deep,
            cursor: 'pointer',
          }}
        >
          {shareState === 'busy' ? 'Ag priontáil…' : null}
          {shareState === 'done' ? 'Roinnte · Shared' : null}
          {shareState === 'failed' ? 'Arís · Try again' : null}
          {shareState === 'idle' ? 'Roinn · Share today’s poster' : null}
        </button>
      </div>

      {/* Footer line on the deepest band */}
      <p
        style={{
          ...CAPS,
          position: 'absolute',
          zIndex: 2,
          bottom: 18,
          left: 0,
          right: 0,
          textAlign: 'center',
          margin: 0,
          fontSize: 11,
          letterSpacing: '0.3em',
          color: inks.stock,
        }}
      >
        {spotLine} · ÉIRE
      </p>

      {/* Halftone grain */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 3,
          pointerEvents: 'none',
          opacity: 0.5,
          mixBlendMode: 'multiply',
          backgroundImage: 'radial-gradient(rgba(30, 77, 70, 0.14) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
        }}
      />
    </header>
  );
}
