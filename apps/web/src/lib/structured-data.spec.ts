import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import { getSpot, isRecord } from '@tonnta/data';
import type { Spot } from '@tonnta/types';

import { SITE_URL } from './site';
import type { StructuredDataGraph } from './structured-data';
import { ORGANIZATION_ID, PLACE_ID, buildHomeGraph, buildSiteGraph } from './structured-data';

const feature = await loadFeature('./structured-data.feature');

const NOW = new Date('2026-08-18T09:00:00.000Z');

function donabate(): Spot {
  const spot = getSpot('donabate');
  if (spot === undefined) {
    throw new Error('the spot registry no longer has donabate');
  }
  return spot;
}

function nodeOfType(graph: StructuredDataGraph, type: string): Record<string, unknown> {
  const match = graph['@graph'].find((node) => node['@type'] === type);
  if (match === undefined) {
    throw new Error(`no ${type} node in the graph`);
  }
  return { ...match };
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('The site graph identifies the organisation and the website', ({ When, Then, And }) => {
    let graph: StructuredDataGraph | undefined;

    When('I build the site graph', () => {
      graph = buildSiteGraph();
    });
    Then('it is a schema.org graph holding an Organization and a WebSite', () => {
      expect(graph?.['@context']).toBe('https://schema.org');
      expect(graph?.['@graph'].map((node) => node['@type'])).toEqual(['Organization', 'WebSite']);
    });
    And('the WebSite is published by the Organization', () => {
      const website = graph === undefined ? {} : nodeOfType(graph, 'WebSite');
      expect(website.publisher).toEqual({ '@id': ORGANIZATION_ID });
      expect(website.url).toBe(`${SITE_URL}/`);
    });
  });

  Scenario(
    'The home graph describes the app, the beach and the forecast data',
    ({ When, Then }) => {
      let graph: StructuredDataGraph | undefined;

      When('I build the home graph for Donabate', () => {
        graph = buildHomeGraph(donabate(), NOW);
      });
      Then('it holds a WebApplication, a Place and a Dataset', () => {
        expect(graph?.['@graph'].map((node) => node['@type'])).toEqual([
          'WebApplication',
          'Place',
          'Dataset',
        ]);
      });
    }
  );

  Scenario(
    'The beach carries real coordinates and its containing region',
    ({ When, Then, And }) => {
      let graph: StructuredDataGraph | undefined;

      When('I build the home graph for Donabate', () => {
        graph = buildHomeGraph(donabate(), NOW);
      });
      Then('the Place geo matches the spot registry coordinates', () => {
        const place = graph === undefined ? {} : nodeOfType(graph, 'Place');
        expect(place.geo).toEqual({
          '@type': 'GeoCoordinates',
          latitude: donabate().latitude,
          longitude: donabate().longitude,
        });
        expect(place.alternateName).toBe('Domhnach Bat');
      });
      And('the Place sits in County Dublin, Ireland', () => {
        const place = graph === undefined ? {} : nodeOfType(graph, 'Place');
        expect(place.containedInPlace).toEqual({
          '@type': 'AdministrativeArea',
          name: 'County Dublin',
          containedInPlace: { '@type': 'Country', name: 'Ireland' },
        });
      });
    }
  );

  Scenario('The forecast is described as a dataset', ({ When, Then, And }) => {
    let graph: StructuredDataGraph | undefined;

    When('I build the home graph for Donabate', () => {
      graph = buildHomeGraph(donabate(), NOW);
    });
    Then('the Dataset covers the seven days from today', () => {
      const dataset = graph === undefined ? {} : nodeOfType(graph, 'Dataset');
      expect(dataset.temporalCoverage).toBe('2026-08-18/2026-08-25');
      expect(dataset.spatialCoverage).toEqual({ '@id': PLACE_ID });
      expect(dataset.isAccessibleForFree).toBe(true);
    });
    And('the Dataset measures wave height, period, wind and tide', () => {
      const dataset = graph === undefined ? {} : nodeOfType(graph, 'Dataset');
      const measured = dataset.variableMeasured;
      const names = Array.isArray(measured)
        ? measured.map((item: unknown) => (isRecord(item) ? item.name : undefined))
        : [];
      expect(names).toContain('Significant wave height');
      expect(names).toContain('Wave period');
      expect(names).toContain('Wind speed');
      expect(names).toContain('Tide height');
    });
    And('the Dataset is distributed through the MCP endpoint', () => {
      const dataset = graph === undefined ? {} : nodeOfType(graph, 'Dataset');
      expect(dataset.distribution).toEqual([
        {
          '@type': 'DataDownload',
          name: 'Tonnta MCP endpoint',
          encodingFormat: 'application/json',
          contentUrl: `${SITE_URL}/mcp`,
          description:
            'JSON-RPC 2.0 over POST. Call tools/list to enumerate, then tools/call with get_surf_conditions for the current reading.',
        },
      ]);
    });
  });

  Scenario('The app is a free web application', ({ When, Then }) => {
    let graph: StructuredDataGraph | undefined;

    When('I build the home graph for Donabate', () => {
      graph = buildHomeGraph(donabate(), NOW);
    });
    Then('the WebApplication is a free SportsApplication running on the Web', () => {
      const app = graph === undefined ? {} : nodeOfType(graph, 'WebApplication');
      expect(app.applicationCategory).toBe('SportsApplication');
      expect(app.operatingSystem).toBe('Web');
      expect(app.offers).toEqual({ '@type': 'Offer', price: '0', priceCurrency: 'EUR' });
    });
  });

  Scenario('No FAQ markup is invented', ({ When, Then }) => {
    let serialised = '';

    When('I build the site graph', () => {
      serialised = JSON.stringify([buildSiteGraph(), buildHomeGraph(donabate(), NOW)]);
    });
    Then('no node claims to be an FAQPage', () => {
      expect(serialised).not.toContain('FAQPage');
    });
  });
});
