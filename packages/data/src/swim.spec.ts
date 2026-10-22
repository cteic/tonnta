import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type {
  HourlyConditions,
  Spot,
  SwimVerdictResult,
  TideEvent,
  WaterQualityAlert,
} from '@tonnta/types';

import { isRecord } from './guards';
import { findBeachAlert } from './sources/epa-bathing';
import { getSpot } from './spots';
import type { SwimWindow } from './swim';
import { applyWaterQuality, assessSwimHour, findSwimWindows } from './swim';

const feature = await loadFeature('./swim.feature');

const donabate = getSpot('donabate');
if (donabate === undefined) {
  throw new Error('Donabate spot missing from registry');
}
const spot: Spot = donabate;

const BALCARRICK_ID = 'IEEABWC020_0000_0100';

function hourAt(time: string, waveHeightM: number, windSpeedKmh: number): HourlyConditions {
  return {
    time,
    waveHeightM,
    wavePeriodS: 4,
    waveDirectionDeg: 90,
    windSpeedKmh,
    windGustKmh: windSpeedKmh * 1.3,
    windDirectionDeg: 250,
    windState: 'offshore',
    seaTempC: 15.2,
  };
}

const NOON = '2026-07-04T12:00:00Z';
const HIGH_AT_ONE = [{ time: '2026-07-04T13:00:00Z', kind: 'high', heightM: 1.4 }] as const;

function epaPayload(beachId: string, restriction: 'Yes' | 'No'): unknown {
  return {
    count: 1,
    list: [
      {
        incident_id: 1,
        beach_id: beachId,
        beach_name: 'Donabate, Balcarrick Beach',
        has_bathing_restriction_in_place: restriction,
        incident_start_date: '2026-07-01',
      },
    ],
  };
}

describeFeature(feature, ({ Scenario }) => {
  const assessScenario = (
    title: string,
    given: string,
    hour: HourlyConditions,
    tides: TideEvent[],
    expected: 'great' | 'ok' | 'no',
    expectNearHigh?: boolean
  ): void => {
    Scenario(title, ({ Given, When, Then, And }) => {
      let result: SwimVerdictResult | undefined;

      Given(given, () => {
        // inputs come from the case parameters
      });
      When('I assess the swim hour', () => {
        result = assessSwimHour(hour, tides);
      });
      Then(`the swim verdict should be ${expected}`, () => {
        expect(result?.verdict).toBe(expected);
      });
      if (expectNearHigh === true) {
        And('the result should note it is near high tide', () => {
          expect(result?.nearHighTide).toBe(true);
        });
      }
    });
  };

  assessScenario(
    'Calm flat water is a great swim',
    'calm conditions of 0.2m waves with 8km/h wind',
    hourAt(NOON, 0.2, 8),
    [],
    'great'
  );
  assessScenario(
    'A great swim near high tide mentions the tide',
    'calm conditions of 0.2m waves with 8km/h wind near a high tide',
    hourAt(NOON, 0.2, 8),
    [...HIGH_AT_ONE],
    'great',
    true
  );
  assessScenario(
    'Light chop is grand for a dip',
    'choppy conditions of 0.5m waves with 20km/h wind',
    hourAt(NOON, 0.5, 20),
    [],
    'ok'
  );
  assessScenario(
    'A rough sea is not a swim day',
    'rough conditions of 0.8m waves with 30km/h wind',
    hourAt(NOON, 0.8, 30),
    [],
    'no'
  );
  assessScenario(
    'A surf GO day is a swim NO day',
    'surfable conditions of 0.7m waves with 24km/h wind',
    hourAt(NOON, 0.7, 24),
    [],
    'no'
  );

  Scenario('A bathing restriction overrides a great swim verdict', ({ Given, And, When, Then }) => {
    let alert: WaterQualityAlert | undefined;
    let result: SwimVerdictResult | undefined;

    Given('calm conditions of 0.2m waves with 8km/h wind', () => {
      // hour built below
    });
    And('an active bathing restriction at Balcarrick', () => {
      alert = findBeachAlert(epaPayload(BALCARRICK_ID, 'Yes'), BALCARRICK_ID);
    });
    When('I assess the swim hour with water quality applied', () => {
      result = applyWaterQuality(assessSwimHour(hourAt(NOON, 0.2, 8), []), alert);
    });
    Then('the swim verdict should be no', () => {
      expect(result?.verdict).toBe('no');
    });
    And('the reason should mention the restriction', () => {
      expect(result?.reason).toContain('restriction');
    });
  });

  Scenario('A lifted restriction changes nothing', ({ Given, And, When, Then }) => {
    let alert: WaterQualityAlert | undefined;
    let result: SwimVerdictResult | undefined;

    Given('calm conditions of 0.2m waves with 8km/h wind', () => {
      // hour built below
    });
    And('a lifted bathing restriction at Balcarrick', () => {
      alert = findBeachAlert(epaPayload(BALCARRICK_ID, 'No'), BALCARRICK_ID);
    });
    When('I assess the swim hour with water quality applied', () => {
      result = applyWaterQuality(assessSwimHour(hourAt(NOON, 0.2, 8), []), alert);
    });
    Then('the swim verdict should be great', () => {
      expect(result?.verdict).toBe('great');
    });
  });

  Scenario('Swim windows prefer high tide', ({ Given, When, Then }) => {
    let windows: SwimWindow[] = [];

    Given('a swimmable morning far from high tide and a swimmable evening near high tide', () => {
      // built in the When step from fixture hours
    });
    When('I find the swim windows', () => {
      const hours = [
        hourAt('2026-07-04T08:00:00Z', 0.2, 8),
        hourAt('2026-07-04T09:00:00Z', 0.2, 8),
        // rough mid-day gap splits the windows
        hourAt('2026-07-04T12:00:00Z', 0.9, 35),
        hourAt('2026-07-04T17:00:00Z', 0.2, 8),
        hourAt('2026-07-04T18:00:00Z', 0.2, 8),
      ];
      const tides: TideEvent[] = [{ time: '2026-07-04T18:30:00Z', kind: 'high', heightM: 1.5 }];
      windows = findSwimWindows(hours, tides, spot, Date.parse('2026-07-04T06:00:00Z'));
    });
    Then('the first window should be the one near high tide', () => {
      expect(windows).toHaveLength(2);
      expect(windows[0]?.nearHighTide).toBe(true);
      expect(windows[0]?.start).toBe('2026-07-04T17:00:00Z');
    });
  });

  Scenario('The EPA alert parser finds an active restriction', ({ Given, When, Then }) => {
    let payload: unknown;
    let alert: WaterQualityAlert | undefined;

    Given('an EPA alerts payload with a restriction for Balcarrick', () => {
      payload = epaPayload(BALCARRICK_ID, 'Yes');
    });
    When('I parse the payload for Balcarrick', () => {
      alert = findBeachAlert(payload, BALCARRICK_ID);
    });
    Then('the parsed alert should have a restriction in place', () => {
      expect(alert?.restrictionInPlace).toBe(true);
      expect(alert?.beachName).toBe('Donabate, Balcarrick Beach');
    });
  });

  Scenario('The EPA alert parser ignores other beaches', ({ Given, When, Then }) => {
    let payload: unknown;
    let alert: WaterQualityAlert | undefined;

    Given('an EPA alerts payload with a restriction for another beach', () => {
      payload = epaPayload('IESHBWL26_624_0100', 'Yes');
    });
    When('I parse the payload for Balcarrick', () => {
      alert = findBeachAlert(payload, BALCARRICK_ID);
    });
    Then('no alert should be found', () => {
      expect(alert).toBeUndefined();
    });
  });

  Scenario(
    'An active restriction wins over a lifted one at the same beach',
    ({ Given, When, Then }) => {
      let payload: unknown;
      let alert: WaterQualityAlert | undefined;

      Given(
        'an EPA alerts payload listing a lifted incident before an active one for Balcarrick',
        () => {
          const lifted = epaPayload(BALCARRICK_ID, 'No');
          const active = epaPayload(BALCARRICK_ID, 'Yes');
          const items = (value: unknown): unknown[] =>
            isRecord(value) && Array.isArray(value.list) ? value.list : [];
          payload = { count: 2, list: [...items(lifted), ...items(active)] };
        }
      );
      When('I parse the payload for Balcarrick', () => {
        alert = findBeachAlert(payload, BALCARRICK_ID);
      });
      Then('the parsed alert should have a restriction in place', () => {
        expect(alert?.restrictionInPlace).toBe(true);
      });
    }
  );

  Scenario('A calm day splits at the high-tide band', ({ Given, When, Then, And }) => {
    let hours: HourlyConditions[] = [];
    let windows: SwimWindow[] = [];
    // Irish summer time is UTC+1: 09:00 to 21:00 Irish time is 08:00 to 20:00 UTC.
    const utc = (h: number) => `2026-07-04T${String(h).padStart(2, '0')}:00:00Z`;
    const tides: TideEvent[] = [{ time: utc(14), kind: 'high', heightM: 1.5 }];

    Given('calm water from 09:00 to 21:00 Irish time and a high tide at 15:00', () => {
      hours = Array.from({ length: 13 }, (_, i) => hourAt(utc(8 + i), 0.2, 8));
    });
    When('I find the swim windows', () => {
      windows = findSwimWindows(hours, tides, spot, Date.parse(utc(6)));
    });
    Then('the first window runs from 13:00 to the 17:00 hour, around that high tide', () => {
      expect(windows[0]).toMatchObject({
        start: utc(12),
        end: utc(16),
        nearHighTide: true,
        highTide: utc(14),
      });
    });
    And('the low-water stretches either side are separate windows', () => {
      expect(windows.slice(1).map((w) => [w.start, w.end, w.nearHighTide])).toEqual([
        [utc(8), utc(11), false],
        [utc(17), utc(20), false],
      ]);
    });
  });

  Scenario('A swim window that has ended is not offered', ({ Given, When, Then }) => {
    let hours: HourlyConditions[] = [];
    let windows: SwimWindow[] = [];
    Given('calm water from 09:00 to 11:00 Irish time and rough water after', () => {
      hours = [
        hourAt('2026-07-04T08:00:00Z', 0.2, 8),
        hourAt('2026-07-04T09:00:00Z', 0.2, 8),
        hourAt('2026-07-04T10:00:00Z', 0.2, 8),
        hourAt('2026-07-04T11:00:00Z', 0.9, 35),
        hourAt('2026-07-04T14:00:00Z', 0.9, 35),
      ];
    });
    When('I find the swim windows at 14:00', () => {
      windows = findSwimWindows(hours, [], spot, Date.parse('2026-07-04T13:00:00Z'));
    });
    Then('there are no swim windows', () => {
      expect(windows).toEqual([]);
    });
  });

  Scenario('No swimming in a thunderstorm', ({ Given, When, Then }) => {
    let hour: HourlyConditions | undefined;
    let result: SwimVerdictResult | undefined;
    Given('calm water under a thunderstorm', () => {
      hour = { ...hourAt(NOON, 0.2, 8), weatherCode: 95 };
    });
    When('I assess the swim', () => {
      if (hour === undefined) throw new Error('no hour');
      result = assessSwimHour(hour, []);
    });
    Then('the swim verdict should be no because of lightning', () => {
      expect(result?.verdict).toBe('no');
      expect(result?.reason).toContain('Lightning');
    });
  });

  Scenario('A swim window in progress starts at the hour in progress', ({ Given, When, Then }) => {
    let hours: HourlyConditions[] = [];
    let windows: SwimWindow[] = [];
    Given('calm water from 09:00 to 13:00 Irish time', () => {
      hours = [8, 9, 10, 11].map((h) =>
        hourAt(`2026-07-04T${String(h).padStart(2, '0')}:00:00Z`, 0.2, 8)
      );
    });
    When('I find the swim windows at 11:30', () => {
      windows = findSwimWindows(hours, [], spot, Date.parse('2026-07-04T10:30:00Z'));
    });
    Then('the window starts at 11:00', () => {
      expect(windows.map((w) => w.start)).toEqual(['2026-07-04T10:00:00Z']);
    });
  });
});
