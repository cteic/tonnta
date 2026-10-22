'use client';

import { useEffect } from 'react';

import { isRecord } from '@tonnta/data';

import { SURF_TOOL, SURF_TOOL_NAME } from '@/lib/mcp';

/**
 * WebMCP registration — progressive enhancement, nothing more.
 *
 * `document.modelContext` is a W3C Community Group draft (not a standard,
 * no browser shipping it yet), so every path here is behind a feature
 * detection and the component renders nothing. Where it is present, the
 * in-page agent gets the same tool the /mcp endpoint serves, executed by
 * calling that endpoint same-origin so there is one implementation.
 *
 * Note the namespace: `document.modelContext`, not `navigator.modelContext`
 * — the draft moved it in August 2026.
 */

interface ToolTextContent {
  type: 'text';
  text: string;
}

interface ToolResult {
  content: ToolTextContent[];
}

interface ModelContext {
  registerTool: (tool: Record<string, unknown>) => unknown;
  unregisterTool?: (name: string) => unknown;
}

function isModelContext(value: unknown): value is ModelContext {
  return isRecord(value) && typeof value.registerTool === 'function';
}

function readModelContext(): ModelContext | undefined {
  if (typeof document === 'undefined' || !('modelContext' in document)) {
    return undefined;
  }
  const candidate: unknown = Reflect.get(document, 'modelContext');
  return isModelContext(candidate) ? candidate : undefined;
}

function isToolResult(value: unknown): value is ToolResult {
  if (!isRecord(value) || !Array.isArray(value.content)) {
    return false;
  }
  return value.content.every(
    (item: unknown) => isRecord(item) && item.type === 'text' && typeof item.text === 'string'
  );
}

async function callSurfEndpoint(args: unknown, signal?: AbortSignal): Promise<ToolResult> {
  const request: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: SURF_TOOL_NAME, arguments: args },
    }),
  };
  if (signal !== undefined) {
    request.signal = signal;
  }

  const response = await fetch('/mcp', request);
  const body: unknown = await response.json();
  if (isRecord(body) && isToolResult(body.result)) {
    return body.result;
  }
  return {
    content: [
      { type: 'text', text: 'Tonnta could not read the sea just now — try again shortly.' },
    ],
  };
}

export function WebMcpTools() {
  useEffect(() => {
    const modelContext = readModelContext();
    if (modelContext === undefined) {
      return;
    }

    const controller = new AbortController();
    try {
      modelContext.registerTool({
        name: SURF_TOOL.name,
        description: SURF_TOOL.description,
        inputSchema: SURF_TOOL.inputSchema,
        execute: (args: unknown, options?: { signal?: AbortSignal }) =>
          callSurfEndpoint(args, options?.signal ?? controller.signal),
      });
    } catch {
      return;
    }

    return () => {
      controller.abort();
      const unregister = modelContext.unregisterTool;
      if (typeof unregister === 'function') {
        try {
          unregister.call(modelContext, SURF_TOOL.name);
        } catch {
          // The draft leaves teardown semantics open; a failure here is inert.
        }
      }
    };
  }, []);

  return null;
}
