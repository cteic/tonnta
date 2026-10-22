import { DEFAULT_SPOT_ID, SPOTS, getSpot, isRecord } from '@tonnta/data';
import type { Spot, TideEvent } from '@tonnta/types';

import type { SpotConditions } from '@/lib/conditions';
import {
  BOARD_LABEL,
  VERDICT_LABEL,
  WIND_STATE_LABEL,
  compassPoint,
  formatDayName,
  formatHour,
} from '@/lib/format';
import { SITE_NAME, SITE_URL } from '@/lib/site';

/**
 * A minimal MCP server over JSON-RPC 2.0, hand-rolled — the surface is
 * `initialize`, `tools/list` and `tools/call`, which is small enough that a
 * framework would be more code than the thing it wraps.
 *
 * One tool, deliberately: the question an agent actually gets asked about
 * this site is "is it worth surfing today?", and that is what
 * `get_surf_conditions` answers — in prose first, numbers second.
 * It takes a spot id, so every spot in the registry is reachable.
 */

export const MCP_PROTOCOL_VERSION = '2026-07-28';
export const SURF_TOOL_NAME = 'get_surf_conditions';

/** Advertised in the tool schema so an agent need not guess a spot id. */
const SPOT_IDS: readonly string[] = SPOTS.map((spot) => spot.id);

export const JSON_RPC_INVALID_REQUEST = -32600;
export const JSON_RPC_METHOD_NOT_FOUND = -32601;
export const JSON_RPC_INVALID_PARAMS = -32602;

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  method: string;
  id: JsonRpcId;
  params: unknown;
  /** A notification carries no id and gets no response body. */
  isNotification: boolean;
}

export interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result: Record<string, unknown>;
}

export interface JsonRpcFailure {
  jsonrpc: '2.0';
  id: JsonRpcId;
  error: { code: number; message: string };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;

interface JsonSchemaProperty {
  type: string;
  description: string;
  default?: string;
}

interface JsonSchemaObject {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties: false;
}

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchemaObject;
}

export const SURF_TOOL: McpTool = {
  name: SURF_TOOL_NAME,
  title: 'Get surf conditions',
  description:
    'Answer "is it worth surfing today?" for a Tonnta surf spot, defaulting to Donabate beach, County Dublin, Ireland. Returns the current verdict (GO, MAYBE, FLAT or BLOWN OUT), wave height and period, wind speed, direction and whether it is onshore or offshore, the tide state, sea temperature, and the board call (SUP, foamie or longboard) with the reasoning.',
  inputSchema: {
    type: 'object',
    properties: {
      spot_id: {
        type: 'string',
        description: `Spot identifier. One of: ${SPOT_IDS.join(', ')}.`,
        default: DEFAULT_SPOT_ID,
      },
    },
    additionalProperties: false,
  },
};

export const MCP_TOOLS: readonly McpTool[] = [SURF_TOOL];

function success(id: JsonRpcId, result: Record<string, unknown>): JsonRpcSuccess {
  return { jsonrpc: '2.0', id, result };
}

function failure(id: JsonRpcId, code: number, message: string): JsonRpcFailure {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function readId(value: unknown): JsonRpcId {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return null;
}

/** JSON-RPC 2.0 envelope check — anything malformed is an invalid request. */
export function parseJsonRpcRequest(body: unknown): JsonRpcRequest | undefined {
  if (!isRecord(body)) {
    return undefined;
  }
  if (body.jsonrpc !== '2.0' || typeof body.method !== 'string') {
    return undefined;
  }
  return {
    method: body.method,
    id: readId(body.id),
    params: body.params,
    isNotification: body.id === undefined,
  };
}

interface SurfToolArgs {
  spotId: string;
}

/** Runtime-validated arguments — the wire is untrusted, so no casts. */
export function parseSurfToolArgs(value: unknown): SurfToolArgs | undefined {
  if (value === undefined || value === null) {
    return { spotId: DEFAULT_SPOT_ID };
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const raw = value.spot_id;
  if (raw === undefined) {
    return { spotId: DEFAULT_SPOT_ID };
  }
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return undefined;
  }
  return { spotId: raw.trim() };
}

function nextTide(tides: TideEvent[], now: Date): TideEvent | undefined {
  const iso = now.toISOString();
  return tides.find((tide) => tide.time >= iso);
}

/** Spoken country name per registry country code. */
const COUNTRY_NAME: Record<Spot['country'], string> = {
  IE: 'Ireland',
  ES: 'Spain',
};

/** The page a reader should open for a spot: `/` serves the default one. */
function spotUrl(spot: Spot): string {
  return spot.id === DEFAULT_SPOT_ID ? `${SITE_URL}/` : `${SITE_URL}/s/${spot.id}`;
}

/**
 * The prose half of the tool result. Agents quote sentences far more
 * reliably than they quote JSON, so this is what leads the response.
 */
export function buildConditionsSummary(conditions: SpotConditions, now: Date): string {
  const { spot, now: verdict, currentHour } = conditions;
  const label = VERDICT_LABEL[verdict.verdict];
  const lines: string[] = [
    `${spot.name}, ${spot.region}, ${COUNTRY_NAME[spot.country]} — ${label.english} (${label.irish}).`,
    verdict.reason,
  ];

  if (currentHour !== undefined) {
    const wind = `${Math.round(currentHour.windSpeedKmh)} km/h ${WIND_STATE_LABEL[currentHour.windState]} from ${compassPoint(currentHour.windDirectionDeg)}`;
    const sea =
      currentHour.seaTempC !== undefined ? `, sea ${currentHour.seaTempC.toFixed(1)}°C` : '';
    lines.push(
      `Waves ${currentHour.waveHeightM.toFixed(1)}m at ${currentHour.wavePeriodS.toFixed(0)}s, wind ${wind}${sea}.`
    );
  }

  if (verdict.board !== undefined) {
    lines.push(`Board call: bring the ${BOARD_LABEL[verdict.board]}.`);
  }

  const tide = nextTide(conditions.tides, now);
  if (tide !== undefined) {
    lines.push(
      `Tide is ${tide.kind === 'high' ? 'coming in' : 'going out'} — next ${tide.kind} water ${formatDayName(tide.time, spot.timezone)} ${formatHour(tide.time, spot.timezone)} at ${tide.heightM.toFixed(1)}m.`
    );
  }

  const window = conditions.nextWindow;
  if (window !== undefined && verdict.verdict !== 'go') {
    lines.push(
      `Next good window: ${formatDayName(window.start, spot.timezone)} ${formatHour(window.start, spot.timezone)}–${formatHour(window.end, spot.timezone)}.`
    );
  }

  if (conditions.warnings.length > 0) {
    lines.push(conditions.warnings.join(' '));
  }

  lines.push(`Full picture: ${spotUrl(spot)}`);
  return lines.join('\n');
}

/** The numbers, for anything that would rather compute than read. */
export function buildConditionsPayload(
  conditions: SpotConditions,
  now: Date
): Record<string, unknown> {
  const { spot, currentHour } = conditions;
  const tide = nextTide(conditions.tides, now);

  const payload: Record<string, unknown> = {
    spot: {
      id: spot.id,
      name: spot.name,
      region: spot.region,
      country: spot.country,
      latitude: spot.latitude,
      longitude: spot.longitude,
      timezone: spot.timezone,
    },
    verdict: conditions.now.verdict,
    verdictLabel: VERDICT_LABEL[conditions.now.verdict].english,
    reason: conditions.now.reason,
    swimVerdict: conditions.swimNow.verdict,
    warnings: conditions.warnings,
    source: spotUrl(spot),
  };

  if (conditions.now.board !== undefined) {
    payload.board = conditions.now.board;
  }
  if (currentHour !== undefined) {
    payload.forecastHour = {
      time: currentHour.time,
      waveHeightM: currentHour.waveHeightM,
      wavePeriodS: currentHour.wavePeriodS,
      waveDirectionDeg: currentHour.waveDirectionDeg,
      windSpeedKmh: currentHour.windSpeedKmh,
      windGustKmh: currentHour.windGustKmh,
      windDirectionDeg: currentHour.windDirectionDeg,
      windDirection: compassPoint(currentHour.windDirectionDeg),
      windState: currentHour.windState,
      ...(currentHour.seaTempC !== undefined ? { seaTempC: currentHour.seaTempC } : {}),
    };
  }
  if (tide !== undefined) {
    payload.tide = {
      state: tide.kind === 'high' ? 'rising' : 'falling',
      nextEvent: { kind: tide.kind, time: tide.time, heightM: tide.heightM },
    };
  }
  if (conditions.nextWindow !== undefined) {
    payload.nextGoodWindow = {
      start: conditions.nextWindow.start,
      end: conditions.nextWindow.end,
      ...(conditions.nextWindow.board !== undefined ? { board: conditions.nextWindow.board } : {}),
    };
  }
  if (conditions.buoy !== undefined) {
    payload.buoy = conditions.buoy;
  }
  return payload;
}

export interface McpDependencies {
  loadConditions: (spotId: string) => Promise<SpotConditions>;
  now: () => Date;
}

function toolError(id: JsonRpcId, message: string): JsonRpcSuccess {
  return success(id, {
    content: [{ type: 'text', text: message }],
    isError: true,
  });
}

async function callTool(
  id: JsonRpcId,
  params: unknown,
  deps: McpDependencies
): Promise<JsonRpcResponse> {
  if (!isRecord(params) || typeof params.name !== 'string') {
    return failure(id, JSON_RPC_INVALID_PARAMS, 'A tool name is required.');
  }
  if (params.name !== SURF_TOOL_NAME) {
    return failure(id, JSON_RPC_INVALID_PARAMS, `Unknown tool: ${params.name}`);
  }

  const args = parseSurfToolArgs(params.arguments);
  if (args === undefined) {
    return failure(id, JSON_RPC_INVALID_PARAMS, 'spot_id must be a non-empty string.');
  }
  if (getSpot(args.spotId) === undefined) {
    return toolError(id, `No such spot: ${args.spotId}. Known spots: ${SPOT_IDS.join(', ')}.`);
  }

  try {
    const now = deps.now();
    const conditions = await deps.loadConditions(args.spotId);
    return success(id, {
      content: [{ type: 'text', text: buildConditionsSummary(conditions, now) }],
      structuredContent: buildConditionsPayload(conditions, now),
      isError: false,
    });
  } catch {
    return toolError(id, 'The sea data is unavailable right now — try again in a few minutes.');
  }
}

/** Returns undefined for notifications, which get an empty 202 back. */
export async function handleMcpRequest(
  body: unknown,
  deps: McpDependencies
): Promise<JsonRpcResponse | undefined> {
  const request = parseJsonRpcRequest(body);
  if (request === undefined) {
    return failure(null, JSON_RPC_INVALID_REQUEST, 'Expected a JSON-RPC 2.0 request object.');
  }
  if (request.isNotification) {
    return undefined;
  }

  switch (request.method) {
    case 'initialize':
      return success(request.id, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SITE_NAME.toLowerCase(), title: SITE_NAME, version: '1.0.0' },
        instructions:
          'Call get_surf_conditions to find out whether it is worth surfing right now. It defaults to Donabate beach, County Dublin; pass spot_id for another spot.',
      });
    case 'tools/list':
      return success(request.id, { tools: MCP_TOOLS });
    case 'tools/call':
      return callTool(request.id, request.params, deps);
    case 'ping':
      return success(request.id, {});
    default:
      return failure(request.id, JSON_RPC_METHOD_NOT_FOUND, `Unknown method: ${request.method}`);
  }
}
