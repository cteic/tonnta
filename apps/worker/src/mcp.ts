import { McpServer } from '@modelcontextprotocol/server';
import { createMcpHandler } from 'agents/mcp/server';
import { z } from 'zod';

import type { ForecastCache } from './surf-verdict';
import { surfVerdict } from './surf-verdict';

export function createSurfServer(cache: ForecastCache): McpServer {
  const server = new McpServer({ name: 'tonnta', version: '0.1.0' });
  server.registerTool(
    'surf_verdict',
    {
      description: 'Get the current Donabate surf verdict and board recommendation.',
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async () => {
      try {
        const result = await surfVerdict(cache);
        return {
          content: [{ type: 'text', text: result.reason }],
          structuredContent: result,
        };
      } catch {
        return {
          isError: true,
          content: [
            { type: 'text', text: 'The surf forecast is unavailable. Please try again later.' },
          ],
        };
      }
    }
  );
  return server;
}

export function handleMcp(request: Request, cache: ForecastCache, ctx: ExecutionContext) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  const handler = createMcpHandler(() => createSurfServer(cache), {
    route: '/mcp',
    corsOptions: false,
  });
  return handler(request, {}, ctx);
}
