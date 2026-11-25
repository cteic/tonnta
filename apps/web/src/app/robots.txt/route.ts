import { buildRobotsTxt } from '@/lib/discoverability';
import { SITE_URL, isProductionHost } from '@/lib/site';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Response {
  const body = buildRobotsTxt({
    siteUrl: SITE_URL,
    indexable: isProductionHost(request.headers.get('host')),
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
