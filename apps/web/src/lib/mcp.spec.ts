import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { describe, expect, it } from 'vitest';

import { getSpot, isRecord, sunTimes } from '@tonnta/data';
import type { HourlyConditions, Spot, VerdictResult } from '@tonnta/types';
import type { SpotConditions } from '@tonnta/web-conditions';

import type { JsonRpcResponse } from './mcp';
import {
  MCP_PROTOCOL_VERSION,
  SURF_TOOL_NAME,
  buildConditionsPayload,
  buildConditionsSummary,
  handleMcpRequest,
} from './mcp';
import { SITE_URL } from './site';

const feature = await loadFeature('./mcp.feature');

const NOW = new Date('2026-08-18T09:00:00.000Z');

function spotNamed(id: string): Spot {
  const spot = getSpot(id);
  if (spot === undefined) {
    throw new Error(`the spot registry no longer has ${id}`);
  }
  return spot;
}

const CURRENT_HOUR: HourlyConditions = {
  time: '2026-08-18T09:00:00.000Z',
  waveHeightM: 0.6,
  wavePeriodS: 5,
  waveDirectionDeg: 70,
  windSpeedKmh: 12,
  windGustKmh: 18,
  windDirectionDeg: 250,
  windState: 'cross-off',
  seaTempC: 15.2,
};

const NOW_VERDICT: VerdictResult = {
  verdict: 'go',
  board: 'longboard',
  reason: '0.6m at 5s and the wind is clean — worth going down.',
};

function conditionsFixture(): SpotConditions {
  return {
    spot: spotNamed('donabate'),
    loadedAt: NOW.getTime(),
    now: NOW_VERDICT,
    headline: { kind: 'verdict', hour: CURRENT_HOUR, result: NOW_VERDICT },
    currentHour: CURRENT_HOUR,
    days: [],
    hours: [CURRENT_HOUR],
    tides: [{ time: '2026-08-18T14:20:00.000Z', kind: 'high', heightM: 3.9 }],
    swimNow: { verdict: 'ok', reason: 'Choppy but swimmable.', nearHighTide: true },
    swimWindows: [],
    warnings: [],
  };
}

function dependencies(conditions: SpotConditions = conditionsFixture()) {
  return {
    loadConditions: (): Promise<SpotConditions> => Promise.resolve(conditions),
    now: (): Date => NOW,
  };
}

function firstText(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }
  const first: unknown = content[0];
  if (!isRecord(first) || typeof first.text !== 'string') {
    return '';
  }
  return first.text;
}

function resultOf(response: JsonRpcResponse | undefined): Record<string, unknown> {
  if (response === undefined || !('result' in response)) {
    throw new Error('expected a JSON-RPC result');
  }
  return response.result;
}

function errorOf(response: JsonRpcResponse | undefined): { code: number; message: string } {
  if (response === undefined || !('error' in response)) {
    throw new Error('expected a JSON-RPC error');
  }
  return response.error;
}

describeFeature(feature, ({ Scenario }) => {
  Scenario('A client negotiates capabilities', ({ Given, When, Then }) => {
    let body: unknown;
    let response: JsonRpcResponse | undefined;

    Given('a JSON-RPC initialize request', () => {
      body = { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} };
    });
    When('the endpoint handles it', async () => {
      response = await handleMcpRequest(body, dependencies());
    });
    Then('it answers with the protocol version and the server name', () => {
      const result = resultOf(response);
      expect(result.protocolVersion).toBe(MCP_PROTOCOL_VERSION);
      expect(result.serverInfo).toMatchObject({ name: 'tonnta' });
    });
  });

  Scenario('A client lists the tools', ({ Given, When, Then }) => {
    let body: unknown;
    let response: JsonRpcResponse | undefined;

    Given('a JSON-RPC tools/list request', () => {
      body = { jsonrpc: '2.0', id: 2, method: 'tools/list' };
    });
    When('the endpoint handles it', async () => {
      response = await handleMcpRequest(body, dependencies());
    });
    Then('it returns get_surf_conditions with an input schema', () => {
      const tools = resultOf(response).tools;
      expect(Array.isArray(tools)).toBe(true);
      expect(tools).toHaveLength(1);
      expect(tools).toMatchObject([
        {
          name: SURF_TOOL_NAME,
          inputSchema: { type: 'object', additionalProperties: false },
        },
      ]);
    });
  });

  Scenario('An agent asks whether Donabate is worth surfing', ({ Given, When, Then, And }) => {
    let body: unknown;
    let response: JsonRpcResponse | undefined;

    Given('conditions of 0.6m at 5s with a cross-off breeze', () => {
      body = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: SURF_TOOL_NAME, arguments: { spot_id: 'donabate' } },
      };
    });
    When('the agent calls get_surf_conditions', async () => {
      response = await handleMcpRequest(body, dependencies());
    });
    Then('the result leads with a readable summary naming the verdict and the board', () => {
      const result = resultOf(response);
      expect(result.isError).toBe(false);
      const content = result.content;
      expect(content).toMatchObject([{ type: 'text' }]);
      const text = firstText(content);
      expect(text).toContain('Donabate');
      expect(text).toContain('GO');
      expect(text).toContain('Longboard');
      expect(text).toContain('0.6m at 5s');
      expect(text).toContain('next high water');
    });
    And('the result also carries the numbers as structured content', () => {
      expect(resultOf(response).structuredContent).toMatchObject({
        verdict: 'go',
        board: 'longboard',
        forecastHour: {
          waveHeightM: 0.6,
          wavePeriodS: 5,
          windSpeedKmh: 12,
          windState: 'cross-off',
          windDirection: 'WSW',
          seaTempC: 15.2,
        },
        tide: { state: 'rising' },
        spot: { id: 'donabate', latitude: 53.487, longitude: -6.107 },
      });
    });
  });

  Scenario('A spot outside Ireland is named with its own country', ({ Given, When, Then, And }) => {
    let body: unknown;
    let response: JsonRpcResponse | undefined;

    Given('conditions at El Cotillo, Fuerteventura', () => {
      body = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: { name: SURF_TOOL_NAME, arguments: { spot_id: 'el-cotillo' } },
      };
    });
    When('the agent calls get_surf_conditions for that spot', async () => {
      const conditions = conditionsFixture();
      conditions.spot = spotNamed('el-cotillo');
      response = await handleMcpRequest(body, dependencies(conditions));
    });
    Then('the summary places it in Spain, not Ireland', () => {
      const text = firstText(resultOf(response).content);
      expect(text).toContain('El Cotillo, Fuerteventura, Spain');
      expect(text).not.toContain('Ireland');
      expect(resultOf(response).structuredContent).toMatchObject({
        spot: { id: 'el-cotillo', country: 'ES' },
      });
    });
    And("it links to that spot's own page rather than the home page", () => {
      const text = firstText(resultOf(response).content);
      expect(text).toContain('/s/el-cotillo');
      expect(resultOf(response).structuredContent).toMatchObject({
        source: `${SITE_URL}/s/el-cotillo`,
      });
    });
  });

  Scenario('An unknown method is a JSON-RPC error', ({ Given, When, Then }) => {
    let body: unknown;
    let response: JsonRpcResponse | undefined;

    Given('a JSON-RPC request for a method that does not exist', () => {
      body = { jsonrpc: '2.0', id: 4, method: 'resources/list' };
    });
    When('the endpoint handles it', async () => {
      response = await handleMcpRequest(body, dependencies());
    });
    Then('it returns error -32601 and no result', () => {
      expect(errorOf(response).code).toBe(-32601);
      expect(errorOf(response).message).toContain('resources/list');
      expect(response === undefined ? true : 'result' in response).toBe(false);
    });
  });

  Scenario('A malformed envelope is rejected', ({ Given, When, Then }) => {
    let body: unknown;
    let response: JsonRpcResponse | undefined;

    Given('a body that is not a JSON-RPC request', () => {
      body = { hello: 'there' };
    });
    When('the endpoint handles it', async () => {
      response = await handleMcpRequest(body, dependencies());
    });
    Then('it returns error -32600', () => {
      expect(errorOf(response).code).toBe(-32600);
    });
  });

  Scenario('A bad spot argument is rejected', ({ Given, When, Then }) => {
    let body: unknown;
    let response: JsonRpcResponse | undefined;

    Given('a tools/call request with an empty spot_id', () => {
      body = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: { name: SURF_TOOL_NAME, arguments: { spot_id: '  ' } },
      };
    });
    When('the endpoint handles it', async () => {
      response = await handleMcpRequest(body, dependencies());
    });
    Then('it returns error -32602', () => {
      expect(errorOf(response).code).toBe(-32602);
    });
  });

  Scenario('A notification gets no response body', ({ Given, When, Then }) => {
    let body: unknown;
    let response: JsonRpcResponse | undefined;

    Given('a JSON-RPC notification with no id', () => {
      body = { jsonrpc: '2.0', method: 'notifications/initialized' };
    });
    When('the endpoint handles it', async () => {
      response = await handleMcpRequest(body, dependencies());
    });
    Then('nothing is returned', () => {
      expect(response).toBeUndefined();
    });
  });
});

describe('live MCP daylight and freshness', () => {
  function at(clock: number): SpotConditions {
    const conditions = conditionsFixture();
    const hour = {
      ...CURRENT_HOUR,
      time: new Date(Math.floor(clock / 3_600_000) * 3_600_000).toISOString(),
    };
    return { ...conditions, loadedAt: clock - 1000, hours: [hour], currentHour: hour };
  }

  it('recomputes cached positive verdicts on both sides of sunrise and sunset', () => {
    const spot = spotNamed('donabate');
    const { sunrise, sunset } = sunTimes(NOW.getTime(), spot.latitude, spot.longitude);
    if (sunrise === undefined || sunset === undefined) throw new Error('missing sun times');
    for (const [clock, dark] of [
      [sunrise - 1, true],
      [Math.ceil(sunrise), false],
      [sunrise + 1, false],
      [sunset - 1, false],
      [Math.floor(sunset), false],
      [sunset + 1, true],
    ] as const) {
      const conditions = at(clock);
      const payload = buildConditionsPayload(conditions, new Date(clock));
      const summary = buildConditionsSummary(conditions, new Date(clock));
      expect(payload.schemaVersion).toBe(2);
      expect(payload.verdict === 'dark').toBe(dark);
      if (dark) {
        expect(payload.swimVerdict).toBe('dark');
        expect(payload.board).toBeUndefined();
        expect(payload.nextGoodWindow).toBeUndefined();
        expect(payload.forecastHour).toBeDefined();
        expect(summary).toContain('Stay out of the water');
        expect(summary).not.toContain('Board call');
        expect(summary).not.toContain('GO');
      } else {
        expect(payload.verdict).toBe('go');
      }
    }
  });

  it('reports unavailable instead of positive or flat for stale and missing coverage', () => {
    for (const conditions of [
      { ...conditionsFixture(), loadedAt: NOW.getTime() - 3_600_000 },
      { ...conditionsFixture(), hours: [] },
      { ...conditionsFixture(), hours: [{ ...CURRENT_HOUR, time: '2026-08-18T10:00:00Z' }] },
      { ...conditionsFixture(), hours: [{ ...CURRENT_HOUR, time: '2026-08-18T08:00:00Z' }] },
    ]) {
      const payload = buildConditionsPayload(conditions, NOW);
      expect(payload.verdict).toBe('unavailable');
      expect(payload.swimVerdict).toBe('unavailable');
      expect(payload.board).toBeUndefined();
      expect(payload.forecastHour).toBeUndefined();
      expect(buildConditionsSummary(conditions, NOW)).toContain('UNAVAILABLE');
    }
  });

  it('reads the clock after loading so a sunset crossed during fetch is dark', async () => {
    const spot = spotNamed('donabate');
    const { sunset } = sunTimes(NOW.getTime(), spot.latitude, spot.longitude);
    if (sunset === undefined) throw new Error('missing sunset');
    let clock = sunset - 1;
    const response = await handleMcpRequest(
      {
        jsonrpc: '2.0',
        id: 44,
        method: 'tools/call',
        params: { name: SURF_TOOL_NAME },
      },
      {
        now: () => new Date(clock),
        loadConditions: async () => {
          clock = sunset + 1;
          return at(clock);
        },
      }
    );
    expect(resultOf(response).structuredContent).toMatchObject({
      verdict: 'dark',
      swimVerdict: 'dark',
    });
  });
  it('bounds live validity by hour end, freshness and sunset', () => {
    const spot = spotNamed('donabate');
    const { sunset } = sunTimes(NOW.getTime(), spot.latitude, spot.longitude);
    if (sunset === undefined) throw new Error('missing sunset');
    const clock = Math.floor(sunset) - 60_000;
    const nearingSunset = buildConditionsPayload(at(clock), new Date(clock));
    expect(nearingSunset.validUntil).toBe(new Date(sunset).toISOString());
    expect(buildConditionsPayload(conditionsFixture(), NOW).validUntil).toBe(
      '2026-08-18T10:00:00.000Z'
    );
    expect(
      buildConditionsPayload({ ...conditionsFixture(), loadedAt: NOW.getTime() - 3_599_000 }, NOW)
        .validUntil
    ).toBe('2026-08-18T09:00:01.000Z');
    expect(buildConditionsPayload({ ...conditionsFixture(), hours: [] }, NOW).validUntil).toBe(
      NOW.toISOString()
    );
  });
});

describe('MCP window interval semantics', () => {
  it('reports the end of the last forecast hour in prose and structured output', () => {
    const conditions = conditionsFixture();
    conditions.hours = [
      { ...CURRENT_HOUR, waveHeightM: 0.1 },
      { ...CURRENT_HOUR, time: '2026-08-18T10:00:00.000Z' },
    ];
    expect(buildConditionsSummary(conditions, NOW)).toContain('11:00–12:00');
    expect(buildConditionsPayload(conditions, NOW).nextGoodWindow).toMatchObject({
      start: '2026-08-18T10:00:00.000Z',
      end: '2026-08-18T11:00:00.000Z',
    });
  });
});

describe('MCP local surf uncertainty', () => {
  it('recomputes short-period uncertainty instead of repeating a stale positive hero', () => {
    const conditions = conditionsFixture();
    conditions.hours = [{ ...CURRENT_HOUR, wavePeriodS: 3 }];
    const payload = buildConditionsPayload(conditions, NOW);
    expect(payload.verdict).toBe('maybe');
    expect(payload.board).toBeUndefined();
    expect(buildConditionsSummary(conditions, NOW)).toContain('Short-period sea');
  });
});
