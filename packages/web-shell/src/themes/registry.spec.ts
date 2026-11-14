import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { ThemeId } from './registry';
import { getTheme, resolveThemeId } from './registry';

const feature = await loadFeature('./registry.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('An unknown stored value falls back to the default theme', ({ Given, When, Then }) => {
    let stored: unknown;
    let resolved: ThemeId | undefined;

    Given('a stored theme value of neon-disco', () => {
      stored = 'neon-disco';
    });
    When('I resolve the theme id', () => {
      resolved = resolveThemeId(stored);
    });
    Then('the resolved id is eiri', () => {
      expect(resolved).toBe('eiri');
    });
  });

  Scenario('A missing stored value falls back to the default theme', ({ Given, When, Then }) => {
    let stored: unknown;
    let resolved: ThemeId | undefined;

    Given('no stored theme value', () => {
      stored = null;
    });
    When('I resolve the theme id', () => {
      resolved = resolveThemeId(stored);
    });
    Then('the resolved id is eiri', () => {
      expect(resolved).toBe('eiri');
    });
  });

  Scenario('A valid stored value is honoured', ({ Given, When, Then }) => {
    let stored: unknown;
    let resolved: ThemeId | undefined;

    Given('a stored theme value of dawn-v1', () => {
      stored = 'dawn-v1';
    });
    When('I resolve the theme id', () => {
      resolved = resolveThemeId(stored);
    });
    Then('the resolved id is dawn-v1', () => {
      expect(resolved).toBe('dawn-v1');
    });
  });

  Scenario('The legacy theme keeps the launch palette', ({ Given, When, Then }) => {
    let surface: string | undefined;

    Given('the dawn-v1 theme', () => {
      // resolved below
    });
    When('I read its tokens', () => {
      surface = getTheme('dawn-v1').tokens.surface;
    });
    Then('the surface is the launch card colour', () => {
      expect(surface).toBe('#122630');
    });
  });
});
