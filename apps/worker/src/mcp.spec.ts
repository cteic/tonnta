import { expect, it, vi } from 'vitest';

import { handleMcp } from './mcp';
import type { ForecastCache } from './surf-verdict';

class TestSpan implements Span {
  get isTraced() {
    return false;
  }
  setAttribute() {}
  end() {}
}

function trace<T, A extends unknown[]>(
  _name: string,
  callback: (span: Span, ...args: A) => T,
  ...args: A
): T {
  return callback(new TestSpan(), ...args);
}

const ctx: ExecutionContext = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
  tracing: { Span: TestSpan, enterSpan: trace, startActiveSpan: trace },
};

function cache(): ForecastCache {
  return { get: vi.fn(async () => null), put: vi.fn(async () => {}) };
}

async function rpc(method: string, params: object = {}, forecastCache = cache()) {
  const request = new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      Host: 'localhost',
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-06-18',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const response = await handleMcp(request, forecastCache, ctx);
  const body = await response.text();
  const data = body.split('\n').find((line) => line.startsWith('data: '));
  const parsed: unknown = JSON.parse(data ? data.slice(6) : body);
  return { response, parsed };
}

it('initializes over HTTP and advertises one read-only tool', async () => {
  const init = await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'local-test', version: '1' },
  });
  expect(init.response.status).toBe(200);
  const result = await rpc('tools/list');
  expect(result.response.status).toBe(200);
  expect(result.parsed).toMatchObject({
    result: {
      tools: [
        { name: 'surf_verdict', annotations: { readOnlyHint: true, destructiveHint: false } },
      ],
    },
  });
  expect(JSON.stringify(result.parsed).match(/"name":"surf_verdict"/g)).toHaveLength(1);
});

it('returns the cached reason unchanged through tools/call', async () => {
  const forecastCache = cache();
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);
  vi.mocked(forecastCache.get).mockResolvedValue(
    JSON.stringify({
      spot: 'donabate',
      time: now.toISOString(),
      verdict: 'go',
      board: 'longboard',
      reason: 'Original verdict reason.',
    })
  );
  const result = await rpc('tools/call', { name: 'surf_verdict', arguments: {} }, forecastCache);
  expect(result.parsed).toMatchObject({
    result: {
      content: [{ type: 'text', text: 'Original verdict reason.' }],
      structuredContent: { verdict: 'go', board: 'longboard' },
    },
  });
});

it('routes MCP preflight separately from the website endpoints', async () => {
  const response = await handleMcp(
    new Request('http://localhost/mcp', { method: 'OPTIONS' }),
    cache(),
    ctx
  );
  expect(response.status).toBe(204);
  expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);
});
