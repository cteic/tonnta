import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { SolarScene } from './solar';
import { discLiftPx, skyAboveHorizon, solarScene } from './solar';

const feature = await loadFeature('./solar.feature');

const DONABATE = { latitude: 53.487, longitude: -6.107 };

interface SceneCase {
  title: string;
  iso: string;
  then: string;
  and?: string;
  assert: (scene: SolarScene) => void;
}

const CASES: SceneCase[] = [
  {
    title: 'A June pre-dawn hour in Donabate is the predawn phase',
    iso: '2026-06-21T03:40:00Z',
    then: 'the phase is predawn',
    and: 'the disc is a moon',
    assert: (scene) => {
      expect(scene.phase).toBe('predawn');
      expect(scene.disc).toBe('moon');
    },
  },
  {
    title: 'A June sunrise hour in Donabate glows',
    iso: '2026-06-21T04:30:00Z',
    then: 'the phase is sunrise',
    and: 'the glow is full',
    assert: (scene) => {
      expect(scene.phase).toBe('sunrise');
      expect(scene.glow).toBe(1);
    },
  },
  {
    title: 'A June midday in Donabate is plain day',
    iso: '2026-06-21T12:00:00Z',
    then: 'the phase is day',
    and: 'the verdict text is dark ink',
    assert: (scene) => {
      expect(scene.phase).toBe('day');
      expect(scene.text).toBe('#0F2229');
    },
  },
  {
    title: 'A June late evening in Donabate is sunset',
    iso: '2026-06-21T19:50:00Z',
    then: 'the phase is sunset',
    assert: (scene) => {
      expect(scene.phase).toBe('sunset');
    },
  },
  {
    title: 'A December midnight in Donabate is night',
    iso: '2026-12-21T00:00:00Z',
    then: 'the phase is night',
    and: 'the disc is a moon',
    assert: (scene) => {
      expect(scene.phase).toBe('night');
      expect(scene.disc).toBe('moon');
    },
  },
  {
    title: 'A December noon in Donabate is still day despite the low sun',
    iso: '2026-12-21T12:00:00Z',
    then: 'the phase is day',
    assert: (scene) => {
      expect(scene.phase).toBe('day');
    },
  },
];

describeFeature(feature, ({ Scenario }) => {
  for (const testCase of CASES) {
    Scenario(testCase.title, ({ Given, When, Then, And }) => {
      let scene: SolarScene | undefined;

      Given(`the clock reads ${testCase.iso} at Donabate`, () => {
        // fixed instant — no wall clock in tests
      });
      When('I compute the solar scene', () => {
        scene = solarScene(new Date(testCase.iso), DONABATE.latitude, DONABATE.longitude);
      });
      Then(testCase.then, () => {
        if (scene === undefined) throw new Error('scene not computed');
        testCase.assert(scene);
      });
      if (testCase.and !== undefined) {
        And(testCase.and, () => {
          if (scene === undefined) throw new Error('scene not computed');
          testCase.assert(scene);
        });
      }
    });
  }

  Scenario('The sky ends at the horizon on its last stop', ({ Given, When, Then }) => {
    let scene: SolarScene | undefined;

    Given('the clock reads 2026-06-21T12:00:00Z at Donabate', () => {
      // fixed instant
    });
    When('I compute the solar scene', () => {
      scene = solarScene(new Date('2026-06-21T12:00:00Z'), DONABATE.latitude, DONABATE.longitude);
    });
    Then('the sky gradient ends with the last sky stop at 100%', () => {
      if (scene === undefined) throw new Error('scene not computed');
      expect(skyAboveHorizon(scene).endsWith(`${scene.skyStops.at(-1) ?? ''} 100%)`)).toBe(true);
      expect(skyAboveHorizon(scene)).not.toContain(scene.water);
    });
  });

  Scenario('A rising sun sits just above the horizon', ({ Given, When, Then, And }) => {
    let scene: SolarScene | undefined;

    Given('the clock reads 2026-11-27T08:20:00Z at Donabate', () => {
      // fixed instant
    });
    When('I compute the solar scene', () => {
      scene = solarScene(new Date('2026-11-27T08:20:00Z'), DONABATE.latitude, DONABATE.longitude);
    });
    Then('the phase is sunrise', () => {
      expect(scene?.phase).toBe('sunrise');
    });
    And('the disc sits between 6px and 30px above the horizon', () => {
      if (scene === undefined) throw new Error('scene not computed');
      expect(discLiftPx(scene)).toBeGreaterThanOrEqual(6);
      expect(discLiftPx(scene)).toBeLessThanOrEqual(30);
    });
  });

  Scenario('A moon at night sits on the horizon', ({ Given, When, Then, And }) => {
    let scene: SolarScene | undefined;

    Given('the clock reads 2026-11-27T02:00:00Z at Donabate', () => {
      // fixed instant
    });
    When('I compute the solar scene', () => {
      scene = solarScene(new Date('2026-11-27T02:00:00Z'), DONABATE.latitude, DONABATE.longitude);
    });
    Then('the disc is a moon', () => {
      expect(scene?.disc).toBe('moon');
    });
    And('the disc sits 6px above the horizon', () => {
      if (scene === undefined) throw new Error('scene not computed');
      expect(discLiftPx(scene)).toBe(6);
    });
  });

  Scenario('The highest sun lifts no more than 156px', ({ Given, When, Then }) => {
    let scene: SolarScene | undefined;

    Given('the clock reads 2026-06-21T12:00:00Z at Donabate', () => {
      // fixed instant
    });
    When('I compute the solar scene', () => {
      scene = solarScene(new Date('2026-06-21T12:00:00Z'), DONABATE.latitude, DONABATE.longitude);
    });
    Then('the disc sits 156px above the horizon', () => {
      if (scene === undefined) throw new Error('scene not computed');
      expect(discLiftPx(scene)).toBe(156);
    });
  });
});
