import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { SolarScene } from './solar';
import { skyGradient, solarScene } from './solar';

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

  Scenario('The sky gradient always ends in water', ({ Given, When, Then }) => {
    let scene: SolarScene | undefined;

    Given('the clock reads 2026-06-21T12:00:00Z at Donabate', () => {
      // fixed instant
    });
    When('I compute the solar scene', () => {
      scene = solarScene(new Date('2026-06-21T12:00:00Z'), DONABATE.latitude, DONABATE.longitude);
    });
    Then('the gradient ends with the water colour', () => {
      if (scene === undefined) throw new Error('scene not computed');
      expect(skyGradient(scene).endsWith(`${scene.water} 100%)`)).toBe(true);
    });
  });
});
