import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { expect } from 'vitest';

import type { SwellMapBucket, SwellMapObject } from './swell-map';
import { handleSwellMap } from './swell-map';

const feature = await loadFeature('./swell-map.feature');

interface FakeBucket extends SwellMapBucket {
  reads: string[];
}

function fakeBucket(keys: string[]): FakeBucket {
  const reads: string[] = [];
  return {
    reads,
    async get(key: string): Promise<SwellMapObject | null> {
      reads.push(key);
      if (!keys.includes(key)) return null;
      return {
        body: new Response(`body of ${key}`).body ?? new ReadableStream(),
        httpEtag: '"e1"',
      };
    },
  };
}

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  Scenario('The latest manifest is served briefly cached', ({ Given, When, Then, And }) => {
    let bucket = fakeBucket([]);
    let response = new Response();
    Given('the bucket holds a latest manifest', () => {
      bucket = fakeBucket(['latest.json']);
    });
    When('a client requests "/swell-map/latest.json"', async () => {
      response = await handleSwellMap('/swell-map/latest.json', bucket);
    });
    Then('the response status is 200', () => {
      expect(response.status).toBe(200);
    });
    And('the content type is "application/json"', () => {
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
    And('the response caches for 300 seconds', () => {
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    });
  });

  Scenario(
    "A run's frame is served as an image that never changes",
    ({ Given, When, Then, And }) => {
      let bucket = fakeBucket([]);
      let response = new Response();
      Given('the bucket holds frame "f006.png" for run "2026112706"', () => {
        bucket = fakeBucket(['runs/2026112706/f006.png']);
      });
      When('a client requests "/swell-map/runs/2026112706/f006.png"', async () => {
        response = await handleSwellMap('/swell-map/runs/2026112706/f006.png', bucket);
      });
      Then('the response status is 200', async () => {
        expect(response.status).toBe(200);
        expect(await response.text()).toBe('body of runs/2026112706/f006.png');
      });
      And('the content type is "image/png"', () => {
        expect(response.headers.get('Content-Type')).toBe('image/png');
      });
      And('the response is cached as immutable', () => {
        expect(response.headers.get('Cache-Control')).toContain('immutable');
        expect(response.headers.get('ETag')).toBe('"e1"');
      });
    }
  );

  ScenarioOutline(
    'Paths the encoder never writes are refused without reading the bucket',
    ({ When, Then, And }, variables) => {
      const bucket = fakeBucket(['latest.json']);
      let response = new Response();
      When('a client requests "<path>"', async () => {
        response = await handleSwellMap(String(variables.path), bucket);
      });
      Then('the response status is 404', () => {
        expect(response.status).toBe(404);
      });
      And('the bucket was not read', () => {
        expect(bucket.reads).toEqual([]);
      });
    }
  );

  Scenario('A frame missing from the bucket is not found', ({ Given, When, Then }) => {
    let bucket = fakeBucket(['latest.json']);
    let response = new Response();
    Given('an empty bucket', () => {
      bucket = fakeBucket([]);
    });
    When('a client requests "/swell-map/runs/2026112706/f009.png"', async () => {
      response = await handleSwellMap('/swell-map/runs/2026112706/f009.png', bucket);
    });
    Then('the response status is 404', () => {
      expect(response.status).toBe(404);
    });
  });

  Scenario('The worker says so when no bucket is bound', ({ Given, When, Then }) => {
    let bucket: SwellMapBucket | undefined = fakeBucket([]);
    let response = new Response();
    Given('no bucket is bound', () => {
      bucket = undefined;
    });
    When('a client requests "/swell-map/latest.json"', async () => {
      response = await handleSwellMap('/swell-map/latest.json', bucket);
    });
    Then('the response status is 503', () => {
      expect(response.status).toBe(503);
    });
  });
});
