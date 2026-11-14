import swimManifest from '@/lib/swim-manifest';

// Next.js only discovers manifest.ts at the app root; a nested app needs an explicit route.
export function GET(): Response {
  return Response.json(swimManifest(), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
