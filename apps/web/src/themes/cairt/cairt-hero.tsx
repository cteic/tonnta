'use client';

import type { Board, BuoyObservation, HourlyConditions, Spot } from '@tonnta/types';
import {
  boardTag,
  formatDayName,
  formatHour,
  surfFactsLine,
  surfHourFacts,
} from '@tonnta/web-conditions';

/**
 * An Cairt: the harbourmaster's chart. The wave height is stamped on chart
 * paper over the depth contours of the bay; everything else is plate
 * lettering and soundings, all in one ink whatever the forecast.
 * Deliberately single-scheme: a chart is printed once. ("Night passage"
 * dimming needs scheme-aware tokens in the theme engine — noted in the PR.)
 */

interface CairtHeroProps {
  /** The board the engine picked for this hour, shown as a plain tag. */
  board?: Board | undefined;
  hour?: HourlyConditions | undefined;
  buoy?: BuoyObservation | undefined;
  spot: Spot;
}

interface ChartInk {
  paper: string;
  ink: string;
  contour: string;
  marginalia: string;
  panel: string;
}

const CHART_INK: ChartInk = {
  paper: '#EEF2EC',
  ink: '#12333E',
  contour: '#9DB8C2',
  marginalia: '#4D7280',
  panel: 'rgba(255,255,255,0.72)',
};

function toDms(value: number, positive: string, negative: string): string {
  const hemisphere = value >= 0 ? positive : negative;
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = Math.round((minutesFloat - minutes) * 60);
  return `${degrees}°${String(minutes).padStart(2, '0')}′${String(seconds).padStart(2, '0')}″${hemisphere}`;
}

const MONO = "'Spline Sans Mono', ui-monospace, monospace";

function Contours({ ink }: { ink: ChartInk }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 720 460"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.5 }}
    >
      <g fill="none" stroke={ink.contour} strokeWidth="1">
        <path d="M-20 130 C 160 110, 300 160, 480 140 S 700 115, 740 135" />
        <path d="M-20 185 C 180 155, 320 210, 500 180 S 700 155, 740 180" />
        <path d="M-20 250 C 200 210, 340 270, 520 235 S 700 210, 740 235" />
        <path d="M-20 330 C 200 295, 340 355, 520 320 S 700 295, 740 320" />
        <path d="M-20 400 C 180 370, 320 425, 500 395 S 700 372, 740 395" />
      </g>
      <g fontFamily="monospace" fontSize="11" fill={ink.contour}>
        <text x="88" y="122">
          2.1
        </text>
        <text x="420" y="158">
          3.4
        </text>
        <text x="620" y="128">
          5.2
        </text>
        <text x="180" y="238">
          6.8
        </text>
        <text x="540" y="228">
          7.4
        </text>
        <text x="120" y="392">
          4.2
        </text>
        <text x="480" y="415">
          5.9
        </text>
      </g>
    </svg>
  );
}

export function CairtHero({ board, hour, buoy, spot }: CairtHeroProps) {
  const ink = CHART_INK;
  const facts = surfHourFacts(hour);
  const tag = boardTag(board);
  const correctedTo =
    buoy !== undefined
      ? `${formatDayName(buoy.time, spot.timezone)} ${formatHour(buoy.time, spot.timezone)}`.toUpperCase()
      : 'FORECAST ONLY';

  return (
    <header style={{ position: 'relative', background: ink.paper, overflow: 'hidden' }}>
      <style>{`
        @keyframes cairtPress {
          from { transform: rotate(-3deg) scale(1.3); opacity: 0; }
          to { transform: rotate(-3deg) scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cairt-stamp { animation: none !important; }
        }
      `}</style>
      <Contours ink={ink} />
      <div
        style={{
          position: 'relative',
          maxWidth: 720,
          margin: '0 auto',
          padding: '0 24px 26px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 8,
            padding: '12px 0 10px',
            borderTop: `1.5px solid ${ink.ink}`,
            borderBottom: `1.5px solid ${ink.ink}`,
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: '0.12em',
            color: ink.marginalia,
          }}
        >
          <span>
            {toDms(spot.latitude, 'N', 'S')} {toDms(spot.longitude, 'E', 'W')}
          </span>
          <span>{(spot.irishName ?? spot.name).toUpperCase()} · CHART No. DB-1</span>
        </div>

        <div style={{ marginTop: 30 }}>
          <p
            style={{
              margin: 0,
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: ink.marginalia,
            }}
          >
            Tonnta · waves now at {spot.name}
          </p>
          <h1 style={{ position: 'relative', display: 'inline-block', margin: '12px 0 0' }}>
            <span className="tonnta-visually-hidden">{spot.name} surf conditions: waves </span>
            <span
              className="cairt-stamp"
              style={{
                display: 'inline-block',
                fontFamily: "'Clash Display', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(46px, 11vw, 72px)',
                lineHeight: 1,
                color: ink.ink,
                background: 'transparent',
                border: `4px double ${ink.ink}`,
                borderRadius: 6,
                padding: '4px 18px 8px',
                transform: 'rotate(-3deg)',
                animation: 'cairtPress 250ms cubic-bezier(0.34, 1.4, 0.64, 1) both',
              }}
            >
              {facts.waveHeight}
            </span>
          </h1>
          <p
            style={{
              margin: '16px 0 0',
              maxWidth: '40ch',
              fontFamily: MONO,
              fontSize: 12,
              lineHeight: 1.55,
              color: ink.ink,
            }}
          >
            {surfFactsLine(facts)}
          </p>
          {tag !== undefined ? (
            <p
              style={{
                margin: '14px 0 0',
                fontFamily: MONO,
                fontSize: 11.5,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: ink.marginalia,
              }}
            >
              Board{' '}
              <span
                style={{
                  display: 'inline-block',
                  marginLeft: 6,
                  border: `1.5px solid ${ink.ink}`,
                  color: ink.ink,
                  background: ink.panel,
                  padding: '6px 12px',
                }}
              >
                {tag}
              </span>
            </p>
          ) : null}
        </div>

        <p
          style={{
            margin: '10px 0 0',
            fontFamily: MONO,
            fontSize: 9.5,
            letterSpacing: '0.08em',
            color: ink.marginalia,
          }}
        >
          SOUNDINGS IN METRES · DATA: MARINE INSTITUTE, MET ÉIREANN · CORRECTED TO {correctedTo}
        </p>
      </div>
    </header>
  );
}
