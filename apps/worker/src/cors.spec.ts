import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { allowedOrigins, withCors } from './cors';

const feature = await loadFeature('./cors.feature');

const SITE = 'https://tonnta.surf';
const EXTRA = 'https://www.tonnta.surf, https://tonnta-web-staging.pete-9c4.workers.dev';

function siteResponse(): Response {
  return new Response('{}', { headers: { 'Access-Control-Allow-Origin': SITE } });
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('The apex, www and staging sites are all allowed', ({ Given, When, Then, And }) => {
    let allowed: string[] = [];
    let response: Response | undefined;
    Given('the site origin https://tonnta.surf and www and staging on the allow-list', () => {
      allowed = allowedOrigins(SITE, EXTRA);
    });
    When('a browser on https://www.tonnta.surf calls the worker', () => {
      response = withCors(siteResponse(), 'https://www.tonnta.surf', allowed);
    });
    Then('the response allows https://www.tonnta.surf', () => {
      expect(response?.headers.get('Access-Control-Allow-Origin')).toBe('https://www.tonnta.surf');
    });
    And('the response varies by origin', () => {
      expect(response?.headers.get('Vary')).toBe('Origin');
    });
  });

  Scenario('Any other site keeps the site origin', ({ Given, When, Then }) => {
    let allowed: string[] = [];
    let response: Response | undefined;
    Given('the site origin https://tonnta.surf and www and staging on the allow-list', () => {
      allowed = allowedOrigins(SITE, EXTRA);
    });
    When('a browser on https://example.com calls the worker', () => {
      response = withCors(siteResponse(), 'https://example.com', allowed);
    });
    Then('the response allows only https://tonnta.surf', () => {
      expect(response?.headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    });
  });

  Scenario('The site origin is allowed even with no allow-list', ({ Then }) => {
    Then('an empty allow-list still allows https://tonnta.surf', () => {
      expect(allowedOrigins(SITE, undefined)).toEqual([SITE]);
    });
  });
});
