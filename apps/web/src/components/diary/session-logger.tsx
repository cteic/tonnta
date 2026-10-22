'use client';

import { useEffect, useState } from 'react';

import type { Board } from '@tonnta/types';

import type { SessionConditions, SessionEntry, SessionRating } from '@/lib/diary';
import {
  DIARY_STORAGE_KEY,
  addEntry,
  createEntry,
  diaryInsights,
  parseDiary,
  removeEntry,
  serializeDiary,
} from '@/lib/diary';

/**
 * One-tap session logging. The conditions snapshot comes stamped from the
 * server; the person only says how it was and what they rode. Everything
 * stays on this device.
 */

const CARD: React.CSSProperties = {
  background: '#122630',
  border: '1px solid #22404C',
  borderRadius: 16,
  padding: 20,
};

const EYEBROW: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: '#6E8A90',
};

const MONO: React.CSSProperties = {
  fontFamily: "'Spline Sans Mono', monospace",
};

const RATING_OPTIONS: { value: SessionRating; irish: string; english: string }[] = [
  { value: 'good', irish: 'Maith', english: 'Good' },
  { value: 'grand', irish: 'Ceart go leor', english: 'Grand' },
  { value: 'poor', irish: 'Lag', english: 'Poor' },
];

const BOARD_OPTIONS: { value: Board; label: string }[] = [
  { value: 'sup', label: 'SUP' },
  { value: 'foamie', label: 'Foamie' },
  { value: 'longboard', label: 'Longboard' },
];

function pillStyle(selected: boolean, accent: boolean): React.CSSProperties {
  let background = 'transparent';
  if (selected) {
    background = accent ? '#E8A33D' : '#1A343F';
  }
  return {
    padding: '10px 18px',
    borderRadius: 999,
    border: selected ? '1px solid transparent' : '1px solid #31525F',
    background,
    color: selected && accent ? '#0C1B22' : '#E8ECEB',
    fontFamily: "'Clash Display', sans-serif",
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
  };
}

function formatConditions(conditions: SessionConditions): string {
  const sea = conditions.seaTempC !== undefined ? ` · ${conditions.seaTempC.toFixed(1)}°C` : '';
  return `${conditions.waveHeightM.toFixed(1)}m @ ${Math.round(conditions.wavePeriodS)}s · ${conditions.windState} ${Math.round(conditions.windSpeedKmh)}km/h${sea}`;
}

function formatWhen(timestamp: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

interface SessionLoggerProps {
  spotId: string;
  current?: SessionConditions | undefined;
}

export function SessionLogger({ spotId, current }: SessionLoggerProps) {
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [rating, setRating] = useState<SessionRating | undefined>(undefined);
  const [board, setBoard] = useState<Board | undefined>(undefined);
  const [note, setNote] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setEntries(parseDiary(window.localStorage.getItem(DIARY_STORAGE_KEY)));
    setLoaded(true);
  }, []);

  function persist(next: SessionEntry[]): void {
    setEntries(next);
    window.localStorage.setItem(DIARY_STORAGE_KEY, serializeDiary(next));
  }

  function save(): void {
    if (rating === undefined || current === undefined) return;
    const entry = createEntry({ spotId, conditions: current, rating, board, note });
    persist(addEntry(entries, entry));
    setRating(undefined);
    setBoard(undefined);
    setNote('');
    setJustSaved(true);
  }

  const insights = diaryInsights(entries);

  return (
    <>
      <section style={{ ...CARD, borderColor: 'rgba(232,163,61,0.4)' }}>
        {current !== undefined ? (
          <>
            <p style={EYEBROW}>Anois · Logged with these conditions</p>
            <p style={{ ...MONO, margin: '8px 0 16px', fontSize: 13, color: '#A9BDBF' }}>
              {formatConditions(current)}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {RATING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRating(option.value);
                    setJustSaved(false);
                  }}
                  style={pillStyle(rating === option.value, true)}
                >
                  {option.irish}
                  <span style={{ fontWeight: 500, opacity: 0.75 }}> · {option.english}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {BOARD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBoard(board === option.value ? undefined : option.value)}
                  style={pillStyle(board === option.value, false)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note (optional)"
              maxLength={500}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                border: '1px solid #31525F',
                background: '#0C1B22',
                color: '#E8ECEB',
                fontSize: 14,
                marginBottom: 14,
              }}
            />
            <button
              type="button"
              onClick={save}
              disabled={rating === undefined}
              style={{
                padding: '10px 20px',
                borderRadius: 999,
                border: 'none',
                background: rating === undefined ? '#3E5C66' : '#E8A33D',
                color: '#0C1B22',
                fontFamily: "'Clash Display', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                cursor: rating === undefined ? 'not-allowed' : 'pointer',
              }}
            >
              Save session
            </button>
            {justSaved ? (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#8FC1B5' }} role="status">
                Saved — stored on this device only.
              </p>
            ) : null}
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: '#C6D2D2' }}>
            Conditions are unavailable right now, so a new session can&apos;t be stamped — try again
            in a few minutes.
          </p>
        )}
      </section>

      {insights !== undefined ? (
        <section style={CARD}>
          <p style={EYEBROW}>Pátrún · Your pattern</p>
          <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, color: '#C6D2D2' }}>
            Across {insights.goodCount} good sessions, your sweet spot is{' '}
            <strong style={{ color: '#E8ECEB' }}>
              {insights.minWaveM.toFixed(1)}–{insights.maxWaveM.toFixed(1)}m
            </strong>{' '}
            (median {insights.medianWaveM.toFixed(2)}m) with{' '}
            <strong style={{ color: '#E8ECEB' }}>{insights.commonWindState}</strong> wind.
          </p>
        </section>
      ) : null}

      <section style={CARD}>
        <p style={EYEBROW}>Stair · Past sessions</p>
        {!loaded || entries.length === 0 ? (
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.55, color: '#C6D2D2' }}>
            Log your first session — Tonnta remembers the conditions for you.
          </p>
        ) : (
          <ul
            style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 12 }}
          >
            {entries.map((entry) => {
              const ratingOption = RATING_OPTIONS.find((option) => option.value === entry.rating);
              return (
                <li
                  key={entry.id}
                  style={{
                    borderTop: '1px solid #22404C',
                    paddingTop: 12,
                    display: 'grid',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {ratingOption?.irish ?? entry.rating}
                      {entry.board !== undefined
                        ? ` · ${BOARD_OPTIONS.find((option) => option.value === entry.board)?.label ?? entry.board}`
                        : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => persist(removeEntry(entries, entry.id))}
                      aria-label="Delete this session"
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#6E8A90',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      remove
                    </button>
                  </div>
                  <span style={{ ...MONO, fontSize: 12, color: '#A9BDBF' }}>
                    {formatWhen(entry.timestamp)} · {formatConditions(entry.conditions)}
                  </span>
                  {entry.note !== undefined ? (
                    <span style={{ fontSize: 13, color: '#C6D2D2' }}>{entry.note}</span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
