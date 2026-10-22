import { loadSpotConditions } from '@/lib/conditions';
import { handleMcpRequest } from '@/lib/mcp';

export const dynamic = 'force-dynamic';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => undefined);
  const response = await handleMcpRequest(body, {
    loadConditions: loadSpotConditions,
    now: () => new Date(),
  });

  if (response === undefined) {
    return new Response(null, { status: 202 });
  }

  return new Response(JSON.stringify(response), { status: 200, headers: JSON_HEADERS });
}

export function GET(): Response {
  return new Response(
    JSON.stringify({
      error: 'The Tonnta MCP endpoint speaks JSON-RPC 2.0 over POST.',
      methods: ['initialize', 'tools/list', 'tools/call', 'ping'],
    }),
    { status: 405, headers: { ...JSON_HEADERS, Allow: 'POST' } }
  );
}
