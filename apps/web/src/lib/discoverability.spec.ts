import type { Metadata, MetadataRoute } from 'next';

import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { DEFAULT_SPOT_ID, SPOTS } from '@tonnta/data';

import { buildRobotsMetadata, buildRobotsTxt, buildSitemapEntries } from './discoverability';
import { PRODUCTION_ORIGIN, isProductionHost } from './site';

const feature = await loadFeature('./discoverability.feature');

const TRAINING_ONLY = [
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'Applebot-Extended',
];

const CITATION_CRAWLERS = [
  'ClaudeBot',
  'Google-Extended',
  'GPTBot',
  'OAI-SearchBot',
  'PerplexityBot',
];

/** Every user-agent whose group carries a blanket `Disallow: /`. */
function blockedAgents(body: string): string[] {
  const blocked: string[] = [];
  let current: string | undefined;
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('User-agent:')) {
      current = line.slice('User-agent:'.length).trim();
      continue;
    }
    if (line === 'Disallow: /' && current !== undefined) {
      blocked.push(current);
    }
  }
  return blocked;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario(
    'The live site publishes content signals and a sitemap',
    ({ Given, When, Then, And }) => {
      let indexable = false;
      let body = '';

      Given('the production host tonnta.surf', () => {
        indexable = isProductionHost('tonnta.surf');
        expect(indexable).toBe(true);
      });
      When('I build the robots.txt body', () => {
        body = buildRobotsTxt({ siteUrl: PRODUCTION_ORIGIN, indexable });
      });
      Then(
        'it carries the Content-Signal line allowing search and AI input but not training',
        () => {
          const signal = body
            .split('\n')
            .find((line) => line.startsWith('Content-Signal:'))
            ?.slice('Content-Signal:'.length)
            .split(',')
            .map((part) => part.trim());
          expect(signal).toEqual(['search=yes', 'ai-input=yes', 'ai-train=no']);
        }
      );
      And('it reserves rights under Article 4 of the EU copyright directive', () => {
        expect(body).toContain(
          '# ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF\n' +
            '# RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790 ON COPYRIGHT\n' +
            '# AND RELATED RIGHTS IN THE DIGITAL SINGLE MARKET.'
        );
      });
      And('it allows crawling and points at the sitemap', () => {
        expect(body).toContain('User-agent: *');
        expect(body).toContain('Allow: /');
        expect(body.trimEnd().endsWith(`Sitemap: ${PRODUCTION_ORIGIN}/sitemap.xml`)).toBe(true);
      });
      And('it keeps crawlers out of the API path but leaves the MCP endpoint open', () => {
        expect(body).toContain('Disallow: /api/');
        expect(body).not.toContain('Disallow: /mcp');
      });
    }
  );

  Scenario(
    'Training-only crawlers are blocked, citation crawlers are not',
    ({ Given, When, Then, And }) => {
      let body = '';
      let blocked: string[] = [];

      Given('the production robots.txt body', () => {
        body = buildRobotsTxt({ siteUrl: PRODUCTION_ORIGIN, indexable: true });
      });
      When('I read the per-crawler groups', () => {
        blocked = blockedAgents(body);
      });
      Then('every training-only crawler has its own Disallow group', () => {
        expect(blocked).toEqual(TRAINING_ONLY);
        for (const crawler of TRAINING_ONLY) {
          expect(body).toContain(`User-agent: ${crawler}`);
        }
      });
      And('no citation or grounding crawler is blocked', () => {
        for (const crawler of CITATION_CRAWLERS) {
          expect(blocked).not.toContain(crawler);
          expect(body).not.toContain(`User-agent: ${crawler}`);
        }
        expect(body).toContain('allowed ON PURPOSE');
      });
      And('the wildcard group still allows the site', () => {
        expect(blocked).not.toContain('*');
      });
    }
  );

  Scenario('A preview deployment is closed to crawlers', ({ Given, When, Then, And }) => {
    let indexable = true;
    let body = '';

    Given('a Workers versioned preview host', () => {
      indexable = isProductionHost('428de8dc-tonnta-web.pete-9c4.workers.dev');
      expect(indexable).toBe(false);
    });
    When('I build the robots.txt body', () => {
      body = buildRobotsTxt({ siteUrl: PRODUCTION_ORIGIN, indexable });
    });
    Then('it disallows everything', () => {
      expect(body).toContain('User-agent: *');
      expect(body).toContain('Disallow: /');
      expect(body).not.toContain('Allow: /');
    });
    And('it carries no Content-Signal line and no sitemap', () => {
      expect(body).not.toContain('Content-Signal');
      expect(body).not.toContain('Sitemap:');
    });
  });

  Scenario('Only the live domain counts as production', ({ Given, When, Then }) => {
    let hosts: string[] = [];
    let results: boolean[] = [];

    Given('the live domain, the workers.dev alias, a preview host and localhost', () => {
      hosts = [
        'tonnta.surf',
        'WWW.Tonnta.Surf',
        'tonnta-web.pete-9c4.workers.dev',
        '428de8dc-tonnta-web.pete-9c4.workers.dev',
        'tonnta.pages.dev',
        'localhost:3000',
      ];
    });
    When('I check each for production', () => {
      results = hosts.map((host) => isProductionHost(host));
    });
    Then('only the two tonnta.surf hosts are production', () => {
      expect(results).toEqual([true, true, false, false, false, false]);
      expect(isProductionHost(null)).toBe(false);
      expect(isProductionHost(undefined)).toBe(false);
      expect(isProductionHost('')).toBe(false);
      expect(isProductionHost('evil-tonnta.surf')).toBe(false);
    });
  });

  Scenario('The sitemap lists every public route', ({ Given, When, Then, And }) => {
    let origin = '';
    let entries: MetadataRoute.Sitemap = [];
    const lastModified = new Date('2026-08-18T09:00:00.000Z');

    Given('the production origin', () => {
      origin = PRODUCTION_ORIGIN;
    });
    When('I build the sitemap entries', () => {
      entries = buildSitemapEntries(origin, lastModified);
    });
    Then(
      'it lists the home page, the session log, the Pro page and the privacy policy as absolute URLs',
      () => {
        expect(entries.slice(0, 4).map((entry) => entry.url)).toEqual([
          `${origin}/`,
          `${origin}/log`,
          `${origin}/pro`,
          `${origin}/privacy`,
        ]);
        expect(entries.every((entry) => entry.lastModified === lastModified)).toBe(true);
        expect(entries.every((entry) => entry.url.startsWith(`${origin}/`))).toBe(true);
      }
    );
    And('it lists a spot route for every spot except the default one', () => {
      const expected = SPOTS.filter((spot) => spot.id !== DEFAULT_SPOT_ID).map(
        (spot) => `${origin}/s/${spot.id}`
      );
      expect(expected.length).toBeGreaterThan(0);
      expect(entries.slice(4).map((entry) => entry.url)).toEqual(expected);
      expect(entries.map((entry) => entry.url)).not.toContain(`${origin}/s/${DEFAULT_SPOT_ID}`);
    });
    And('the home page is the highest priority entry', () => {
      expect(entries[0]?.priority).toBe(1);
      expect(entries[0]?.changeFrequency).toBe('hourly');
    });
  });

  Scenario('Robots meta directives follow the host', ({ Given, When, Then, And }) => {
    let hosts: string[] = [];
    let directives: Metadata['robots'][] = [];

    Given('the production host and a preview host', () => {
      hosts = ['tonnta.surf', '428de8dc-tonnta-web.pete-9c4.workers.dev'];
    });
    When('I build the robots meta for each', () => {
      directives = hosts.map((host) => buildRobotsMetadata(isProductionHost(host)));
    });
    Then('the production host is indexed and followed', () => {
      expect(directives[0]).toMatchObject({ index: true, follow: true });
    });
    And('the preview host is neither indexed nor followed', () => {
      expect(directives[1]).toEqual({ index: false, follow: false });
    });
  });
});
