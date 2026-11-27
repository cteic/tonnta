import { FRAME_FILE, RUN_ID } from '@tonnta/swell-map';

/**
 * `GET /swell-map/latest.json` and `GET /swell-map/runs/<run>/<file>`:
 * serves the swell map data images that the scheduled encoder job
 * (`scripts/swell-map`, `.github/workflows/swell-map.yml`) writes to R2.
 *
 * Only the key shapes the encoder writes are served, so a request cannot
 * read anything else from the bucket. The latest manifest changes every
 * run and caches briefly; a run's files never change once written.
 */

export interface SwellMapObject {
  body: ReadableStream;
  httpEtag: string;
}

export interface SwellMapBucket {
  get(key: string): Promise<SwellMapObject | null>;
}

const PREFIX = '/swell-map/';
const LATEST_MAX_AGE_S = 300;
const RUN_MAX_AGE_S = 86_400;

interface ServedKey {
  key: string;
  contentType: string;
  cacheControl: string;
}

export function swellMapKey(pathname: string): ServedKey | undefined {
  if (!pathname.startsWith(PREFIX)) return undefined;
  const rest = pathname.slice(PREFIX.length);
  if (rest === 'latest.json') {
    return {
      key: rest,
      contentType: 'application/json',
      cacheControl: `public, max-age=${LATEST_MAX_AGE_S}`,
    };
  }
  const parts = rest.split('/');
  if (parts.length !== 3 || parts[0] !== 'runs') return undefined;
  const [, run, file] = parts;
  if (run === undefined || file === undefined || !RUN_ID.test(run)) return undefined;
  const immutable = `public, max-age=${RUN_MAX_AGE_S}, immutable`;
  if (file === 'manifest.json') {
    return { key: rest, contentType: 'application/json', cacheControl: immutable };
  }
  if (FRAME_FILE.test(file)) {
    return { key: rest, contentType: 'image/png', cacheControl: immutable };
  }
  return undefined;
}

export function isSwellMapPath(pathname: string): boolean {
  return pathname.startsWith(PREFIX);
}

export async function handleSwellMap(
  pathname: string,
  bucket: SwellMapBucket | undefined
): Promise<Response> {
  const served = swellMapKey(pathname);
  if (served === undefined) return notFound();
  if (bucket === undefined) {
    return new Response(JSON.stringify({ error: 'swell map not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const object = await bucket.get(served.key);
  if (object === null) return notFound();
  return new Response(object.body, {
    headers: {
      'Content-Type': served.contentType,
      'Cache-Control': served.cacheControl,
      ETag: object.httpEtag,
    },
  });
}

function notFound(): Response {
  return new Response(JSON.stringify({ error: 'not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
