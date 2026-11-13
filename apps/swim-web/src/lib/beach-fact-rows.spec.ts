import { describe, expect, it } from 'vitest';

import { bathingSeasonOn, getBathingWater } from '@tonnta/data';
import type { BathingWater } from '@tonnta/types';

import { beachFactRows } from './beach-fact-rows';
import type { BeachFacts } from './beach-facts';

function donabate(): BathingWater {
  const water = getBathingWater('donabate-balcarrick-beach');
  if (water === undefined) throw new Error('Missing Donabate');
  return water;
}

const NOVEMBER = new Date('2026-11-13T10:45:00Z');
const JULY = new Date('2026-07-10T12:00:00Z');

function facts(overrides: Partial<BeachFacts>, at: Date = NOVEMBER): BeachFacts {
  return {
    water: donabate(),
    checkedAt: at.toISOString(),
    season: bathingSeasonOn(at),
    status: {
      ok: true,
      value: {
        beachId: 'IEEABWC020_0000_0100',
        classification: 'Excellent Quality',
        classificationYear: 2025,
        hasLifeguard: true,
        lifeguardAvailability: '11am to 7pm weekends only in June & full time July & August',
        allSeasonRestriction: false,
        shortTermPollutionRisk: true,
      },
    },
    alert: { ok: true, value: undefined },
    weather: {
      ok: true,
      value: {
        time: at.toISOString(),
        airTemperatureC: 2.2,
        windSpeedKmh: 21,
        windDirectionDeg: 90,
        windGustKmh: 30,
        rainLast48hMm: 14.2,
      },
    },
    sea: { ok: true, value: { time: at.toISOString(), waterTemperatureC: 12.2, waveHeightM: 0.6 } },
    ...overrides,
  };
}

function row(rows: ReturnType<typeof beachFactRows>, label: string) {
  const found = rows.find((candidate) => candidate.label === label);
  if (found === undefined) throw new Error(`No row ${label}`);
  return found;
}

/** Words that would turn a fact into advice. */
const ADVICE =
  /\b(grand|great|good (?:time|day|swim)|go for|safe to swim(?! is)|perfect|ideal|recommend|stars?)\b/i;

describe('Beach fact rows', () => {
  it('gives every row a source', () => {
    for (const fact of beachFactRows(facts({}))) {
      expect(fact.source).not.toBe('');
    }
  });

  it('never reads as advice, whatever the conditions', () => {
    const calm = facts(
      {
        weather: {
          ok: true,
          value: {
            time: JULY.toISOString(),
            airTemperatureC: 24,
            windSpeedKmh: 3,
            rainLast48hMm: 0,
          },
        },
        sea: {
          ok: true,
          value: { time: JULY.toISOString(), waterTemperatureC: 18, waveHeightM: 0.1 },
        },
      },
      JULY
    );
    for (const fact of [...beachFactRows(calm), ...beachFactRows(facts({}))]) {
      expect(`${fact.label} ${fact.value} ${fact.detail ?? ''}`).not.toMatch(ADVICE);
    }
  });

  it('flags the off season on the November reading that once said "grand for a dip"', () => {
    const rows = beachFactRows(facts({}));
    expect(row(rows, 'Bathing season')).toMatchObject({
      value: 'Outside the bathing season',
      tone: 'notice',
    });
    expect(row(rows, 'Bathing season').detail).toContain('1 June 2027');
    expect(row(rows, 'EPA alert').detail).toContain('does not test');
    expect(row(rows, 'Water temperature and waves').value).toBe('12.2°C water, 0.6 m waves');
  });

  it('quotes the EPA lifeguard schedule and does not claim anyone is on duty', () => {
    const lifeguards = row(beachFactRows(facts({})), 'Lifeguards');
    expect(lifeguards.value).toBe('11am to 7pm weekends only in June & full time July & August');
    expect(lifeguards.detail).toContain('cannot see whether a lifeguard is on duty now');
  });

  it('puts a bathing restriction straight after the alert', () => {
    const rows = beachFactRows(
      facts({
        alert: {
          ok: true,
          value: {
            beachId: 'x',
            beachName: 'Donabate',
            restrictionInPlace: true,
            startDate: '2026-07-08',
          },
        },
      })
    );
    expect(rows[0]).toMatchObject({
      label: 'EPA alert',
      value: 'Bathing restriction in place',
      tone: 'notice',
    });
  });

  it('shows the all-season restriction next to the alert', () => {
    const base = facts({});
    if (!base.status.ok) throw new Error('fixture');
    const rows = beachFactRows({
      ...base,
      status: {
        ok: true,
        value: {
          ...base.status.value,
          allSeasonRestriction: true,
          allSeasonRestrictionReason: 'Poor quality',
        },
      },
    });
    expect(rows[1]).toMatchObject({
      label: 'All-season restriction',
      value: 'In place',
      detail: 'Poor quality',
    });
  });

  it('reads failed sources as unknown, never as fine', () => {
    const rows = beachFactRows(
      facts({
        status: { ok: false },
        alert: { ok: false },
        weather: { ok: false },
        sea: { ok: false },
      })
    );
    expect(row(rows, 'EPA alert')).toMatchObject({ value: 'Unknown', tone: 'notice' });
    expect(row(rows, 'EPA record')).toMatchObject({ value: 'Unknown', tone: 'notice' });
    expect(row(rows, 'Rain, last 48 hours')).toMatchObject({ value: 'Unknown', tone: 'notice' });
    expect(rows.some((fact) => fact.value === 'No active alert listed')).toBe(false);
  });

  it('says when the marine model has nothing, as at a lake', () => {
    const rows = beachFactRows(
      facts({ sea: { ok: true, value: { time: NOVEMBER.toISOString() } } })
    );
    expect(row(rows, 'Water temperature and waves').value).toBe('No model value here');
  });

  it('reads a missing lifeguard listing as unknown', () => {
    const base = facts({});
    if (!base.status.ok) throw new Error('fixture');
    const rows = beachFactRows({
      ...base,
      status: { ok: true, value: { beachId: base.status.value.beachId } },
    });
    expect(row(rows, 'Lifeguards')).toMatchObject({ value: 'Unknown', tone: 'notice' });
  });
});
