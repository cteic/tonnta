'use client';

import { useEffect, useState } from 'react';

import { DEFAULT_SPOT_ID, SPOTS, getSpot } from '@tonnta/data';
import type { Board } from '@tonnta/types';

import type {
  BeachReport,
  ObservedSurf,
  SessionEntry,
  SessionRating,
  VisitKind,
} from '@/lib/diary';
import {
  DIARY_STORAGE_KEY,
  createBeachReport,
  isBoard,
  isRating,
  isVisitKind,
  parseDiary,
  persistBeachReports,
  readBeachReports,
  removeLegacyEntry,
  visitLocalTime,
  visitTimeCandidates,
} from '@/lib/diary';
import type { ForecastSnapshot } from '@/lib/forecast-snapshots';
import { matchForecastSnapshot, readForecastSnapshots } from '@/lib/forecast-snapshots';

const CARD: React.CSSProperties = {
  background: '#122630',
  border: '1px solid #22404C',
  borderRadius: 16,
  padding: 20,
};
const LABEL: React.CSSProperties = { display: 'grid', gap: 6, fontSize: 14, color: '#C6D2D2' };
const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #31525F',
  background: '#0C1B22',
  color: '#E8ECEB',
  fontSize: 16,
};
const BUTTON: React.CSSProperties = {
  padding: '10px 18px',
  borderRadius: 999,
  border: '1px solid #31525F',
  background: 'transparent',
  color: '#E8ECEB',
  fontSize: 14,
  cursor: 'pointer',
};
const SEA_LABELS: Record<ObservedSurf, string> = {
  flat: 'Flat · no breaking waves',
  small: 'Small · weak or tiny waves',
  rideable: 'Rideable · surfable waves',
  messy: 'Messy · choppy or disorganised',
};

function formatWhen(timestamp: string, spotId: string): string {
  return new Intl.DateTimeFormat('en-IE', {
    timeZone: getSpot(spotId)?.timezone ?? 'Europe/Dublin',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(timestamp));
}

function ForecastComparison({
  snapshot,
  spotId,
}: {
  snapshot: ForecastSnapshot | undefined;
  spotId: string;
}) {
  if (snapshot === undefined)
    return (
      <p style={{ margin: 0 }}>
        No saved forecast for this visit. You can still record what you saw.
      </p>
    );
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <strong>Saved model assessment: {snapshot.verdict.verdict.toUpperCase()}</strong>
      <span>{snapshot.verdict.reason}</span>
      <span>
        {snapshot.hour.waveHeightM.toFixed(1)}m open-water waves ·{' '}
        {snapshot.hour.wavePeriodS.toFixed(1)}s · {Math.round(snapshot.hour.windSpeedKmh)}km/h wind
      </span>
      <small>
        For {formatWhen(snapshot.targetHour, spotId)}. Sources checked{' '}
        {formatWhen(snapshot.checkedAt, spotId)}; saved {formatWhen(snapshot.capturedAt, spotId)}.
      </small>
      <small>
        Rules: {snapshot.engineVersion}. This is a saved hourly model assessment, not a measured
        beach wave height or verified model issue time.
      </small>
    </div>
  );
}

export function SessionLogger({ spotId: initialSpotId }: { spotId: string }) {
  const [spotId, setSpotId] = useState(getSpot(initialSpotId)?.id ?? DEFAULT_SPOT_ID);
  const spot = getSpot(spotId) ?? SPOTS[0];
  const timezone = spot?.timezone ?? 'Europe/Dublin';
  const [localTime, setLocalTime] = useState('');
  const [chosenTime, setChosenTime] = useState('');
  const [visitKind, setVisitKind] = useState<VisitKind>('checked');
  const [observedSurf, setObservedSurf] = useState<ObservedSurf | ''>('');
  const [goodEnough, setGoodEnough] = useState('');
  const [rating, setRating] = useState<SessionRating | ''>('');
  const [board, setBoard] = useState<Board | ''>('');
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<BeachReport[]>([]);
  const [legacy, setLegacy] = useState<SessionEntry[]>([]);
  const [snapshots, setSnapshots] = useState<ForecastSnapshot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [historyWarning, setHistoryWarning] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalTime(
      visitLocalTime(new Date().toISOString(), getSpot(initialSpotId)?.timezone ?? 'Europe/Dublin')
    );
    try {
      const result = readBeachReports(window.localStorage);
      if (result.ok) setEntries(result.value);
      else setError(result.error);
      const history = readForecastSnapshots(window.localStorage);
      if (history.ok) setSnapshots(history.value);
      else setHistoryWarning(history.error);
      setLegacy(parseDiary(window.localStorage.getItem(DIARY_STORAGE_KEY)));
    } catch {
      setError(
        'Device storage is unavailable. You can fill in this form, but it cannot be saved yet.'
      );
    }
    setLoaded(true);
  }, [initialSpotId]);

  const candidates = visitTimeCandidates(localTime, timezone);
  const observedAt =
    candidates.length === 1 ? candidates[0] : candidates.find((time) => time === chosenTime);
  const matched =
    observedAt === undefined ? undefined : matchForecastSnapshot(snapshots, spotId, observedAt);

  function changeSpot(next: string): void {
    // Keep the same real instant when switching beaches, while displaying that beach's timezone.
    if (observedAt !== undefined)
      setLocalTime(visitLocalTime(observedAt, getSpot(next)?.timezone ?? 'Europe/Dublin'));
    setSpotId(next);
    setChosenTime('');
    setSaved(false);
  }

  function save(event: React.FormEvent): void {
    event.preventDefault();
    setSaved(false);
    if (observedAt === undefined || observedSurf === '') {
      setError(
        'Choose when you visited and what the surf looked like. For a repeated clock time, choose which occurrence.'
      );
      return;
    }
    try {
      // Re-read before writing so a previous save in another tab is retained.
      const previous = readBeachReports(window.localStorage);
      if (!previous.ok) {
        setError(previous.error);
        return;
      }
      const entry = createBeachReport(
        {
          spotId,
          observedAt,
          visitKind,
          observedSurf,
          goodEnough: goodEnough === '' ? undefined : goodEnough === 'yes',
          rating: rating || undefined,
          board: board || undefined,
          note,
        },
        matched === undefined ? [] : [matched]
      );
      const next = [entry, ...previous.value].sort((a, b) =>
        b.observedAt.localeCompare(a.observedAt)
      );
      const result = persistBeachReports(window.localStorage, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEntries(next);
      setObservedSurf('');
      setGoodEnough('');
      setRating('');
      setBoard('');
      setNote('');
      setError('');
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Not saved. Device storage is unavailable.'
      );
    }
  }

  function remove(id: string): void {
    setSaved(false);
    try {
      const previous = readBeachReports(window.localStorage);
      if (!previous.ok) {
        setError(previous.error);
        return;
      }
      const next = previous.value.filter((entry) => entry.id !== id);
      const result = persistBeachReports(window.localStorage, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEntries(next);
      setError('');
    } catch {
      setError('Could not remove this check. Device storage is unavailable.');
    }
  }

  function removeLegacy(id: string): void {
    setSaved(false);
    try {
      const result = removeLegacyEntry(window.localStorage, id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLegacy(result.value);
      setError('');
    } catch {
      setError('Could not remove this earlier session. Device storage is unavailable.');
    }
  }

  function download(): void {
    try {
      const current = readBeachReports(window.localStorage);
      if (!current.ok) {
        setError(current.error);
        return;
      }
      const older = parseDiary(window.localStorage.getItem(DIARY_STORAGE_KEY));
      const blob = new Blob(
        [
          JSON.stringify(
            {
              schemaVersion: 2,
              exportedAt: new Date().toISOString(),
              beachChecks: current.value,
              legacySessions: older,
              legacyWarning:
                'Legacy timestamps are save times, not verified visit times. Forecast conditions are not observations.',
            },
            null,
            2
          ),
        ],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tonnta-beach-checks.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Could not prepare your download. Nothing has been shared.');
    }
  }

  return (
    <>
      <section style={{ ...CARD, borderColor: 'rgba(232,163,61,0.4)' }}>
        <p style={{ margin: '0 0 16px', lineHeight: 1.55, color: '#C6D2D2' }}>
          A quick beach check is enough. Record what you actually saw, even if you did not surf.
          Kept on this device only, with no login, sharing or automatic changes to the forecast.
        </p>
        <form onSubmit={save} style={{ display: 'grid', gap: 16 }}>
          <label style={LABEL}>
            Beach
            <select
              value={spotId}
              onChange={(event) => changeSpot(event.target.value)}
              style={INPUT}
            >
              {SPOTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label style={LABEL}>
            When were you at the beach?
            <input
              type="datetime-local"
              required
              value={localTime}
              onChange={(event) => {
                setLocalTime(event.target.value);
                setChosenTime('');
                setSaved(false);
              }}
              style={INPUT}
              aria-describedby="visit-time-help"
            />
          </label>
          <small id="visit-time-help">
            Local time at the selected beach: {timezone}. This is your visit time, not the time you
            save this check.
          </small>
          {localTime !== '' && candidates.length === 0 ? (
            <p role="alert">
              That local time does not exist or is invalid. Check the date and daylight-saving clock
              change.
            </p>
          ) : null}
          {candidates.length > 1 ? (
            <label style={LABEL}>
              The clock showed this time twice. Which visit time?
              <select
                value={chosenTime}
                onChange={(event) => setChosenTime(event.target.value)}
                required
                style={INPUT}
              >
                <option value="">Choose the clock offset</option>
                {candidates.map((candidate) => (
                  <option value={candidate} key={candidate}>
                    {new Intl.DateTimeFormat('en-IE', {
                      timeZone: timezone,
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZoneName: 'shortOffset',
                    }).format(new Date(candidate))}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label style={LABEL}>
            What did you do?
            <select
              value={visitKind}
              onChange={(event) => {
                const next = event.target.value;
                if (isVisitKind(next)) setVisitKind(next);
              }}
              style={INPUT}
            >
              <option value="checked">Just checked the beach</option>
              <option value="surfed">Went for a surf</option>
            </select>
          </label>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend style={{ marginBottom: 8 }}>What did the surf look like?</legend>
            <div style={{ display: 'grid', gap: 8 }}>
              {(Object.entries(SEA_LABELS) as [ObservedSurf, string][]).map(([value, label]) => (
                <label
                  key={value}
                  style={{ ...LABEL, display: 'flex', alignItems: 'center', padding: 8 }}
                >
                  <input
                    type="radio"
                    name="observed-surf"
                    required
                    value={value}
                    checked={observedSurf === value}
                    onChange={() => {
                      setObservedSurf(value);
                      setSaved(false);
                    }}
                  />{' '}
                  {label}
                </label>
              ))}
            </div>
            <small>
              Describe the sea first. Your own enjoyment is a separate, optional rating below.
            </small>
          </fieldset>
          <label style={LABEL}>
            Good enough for me? (optional)
            <select
              value={goodEnough}
              onChange={(event) => setGoodEnough(event.target.value)}
              style={INPUT}
            >
              <option value="">Not rated</option>
              <option value="yes">Yes, worth it for me</option>
              <option value="no">No, not for me</option>
            </select>
          </label>
          <label style={LABEL}>
            Personal session rating (optional)
            <select
              value={rating}
              onChange={(event) => {
                const next = event.target.value;
                if (next === '' || isRating(next)) setRating(next);
              }}
              style={INPUT}
            >
              <option value="">Not rated</option>
              <option value="good">Good</option>
              <option value="grand">Grand</option>
              <option value="poor">Poor</option>
            </select>
          </label>
          <label style={LABEL}>
            Board (optional)
            <select
              value={board}
              onChange={(event) => {
                const next = event.target.value;
                if (next === '' || isBoard(next)) setBoard(next);
              }}
              style={INPUT}
            >
              <option value="">None / not recorded</option>
              <option value="sup">SUP</option>
              <option value="foamie">Foamie</option>
              <option value="longboard">Longboard</option>
            </select>
          </label>
          <label style={LABEL}>
            Note (optional)
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              rows={3}
              style={INPUT}
              placeholder="For example: barely breaking, but enough on the longboard"
            />
          </label>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#A9BDBF' }}>
            <ForecastComparison snapshot={matched} spotId={spotId} />
          </div>
          {historyWarning ? (
            <p role="status">
              {historyWarning} Your check can still be saved without a comparison.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!loaded || observedSurf === '' || observedAt === undefined}
            style={{ ...BUTTON, background: '#E8A33D', color: '#0C1B22', fontWeight: 600 }}
          >
            Save beach check
          </button>
        </form>
        {error ? (
          <p role="alert" style={{ color: '#F0B7A9', lineHeight: 1.5 }}>
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" style={{ color: '#8FC1B5' }}>
            Saved on this device only. Nothing was sent and the forecast has not changed.
          </p>
        ) : null}
      </section>
      <section style={CARD}>
        <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>Your beach checks</h2>
        <p style={{ fontSize: 13, color: '#A9BDBF', lineHeight: 1.6 }}>
          These are personal observations, not a safety assessment. Comparing them with saved
          forecasts can inform a later manual review; Tonnta does not learn from them automatically.
          Clearing browser data removes this log.
        </p>
        <button type="button" onClick={download} disabled={!loaded} style={BUTTON}>
          Download my log (JSON)
        </button>
        {entries.length === 0 ? (
          <p>{loaded ? 'No beach checks saved yet.' : 'Loading your local log…'}</p>
        ) : (
          <ul
            style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 16 }}
          >
            {entries.map((entry) => (
              <li
                key={entry.id}
                style={{ borderTop: '1px solid #22404C', paddingTop: 16, display: 'grid', gap: 8 }}
              >
                <strong>
                  {getSpot(entry.spotId)?.name ?? entry.spotId} · {SEA_LABELS[entry.observedSurf]}
                </strong>
                <span>
                  {formatWhen(entry.observedAt, entry.spotId)} ·{' '}
                  {entry.visitKind === 'checked' ? 'Checked the beach' : 'Surfed'}
                </span>
                {entry.goodEnough !== undefined ? (
                  <span>Good enough for me: {entry.goodEnough ? 'yes' : 'no'}</span>
                ) : null}
                {entry.rating !== undefined ? <span>Personal rating: {entry.rating}</span> : null}
                {entry.board !== undefined ? <span>Board: {entry.board}</span> : null}
                {entry.note !== undefined ? <span>{entry.note}</span> : null}
                <details style={{ fontSize: 13, color: '#A9BDBF', lineHeight: 1.6 }}>
                  <summary>Forecast comparison</summary>
                  <ForecastComparison snapshot={entry.forecast} spotId={entry.spotId} />
                </details>
                <button
                  type="button"
                  onClick={() => remove(entry.id)}
                  style={{ ...BUTTON, justifySelf: 'start' }}
                  aria-label={`Remove beach check from ${formatWhen(entry.observedAt, entry.spotId)}`}
                >
                  Remove check
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {legacy.length > 0 ? (
        <section style={CARD}>
          <h2 style={{ marginTop: 0, fontSize: 20 }}>Earlier session diary</h2>
          <p style={{ color: '#A9BDBF', lineHeight: 1.6 }}>
            Preserved from your earlier log. These timestamps record when you saved, not a verified
            visit time. Their forecast values are not beach observations and are excluded from
            comparisons.
          </p>
          <ul>
            {legacy.map((entry) => (
              <li key={entry.id} style={{ marginBottom: 12 }}>
                {getSpot(entry.spotId)?.name ?? entry.spotId} · {entry.rating} · saved{' '}
                {formatWhen(entry.timestamp, entry.spotId)} · visit time unverified
                {entry.note !== undefined ? <p>{entry.note}</p> : null}
                <button
                  type="button"
                  onClick={() => removeLegacy(entry.id)}
                  style={{ ...BUTTON, marginTop: 8 }}
                  aria-label={`Remove earlier session saved ${formatWhen(entry.timestamp, entry.spotId)}`}
                >
                  Remove earlier session
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
