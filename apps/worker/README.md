# Surf verdict MCP endpoint

`/mcp` exposes exactly one read-only tool, `surf_verdict`, for Donabate. It
returns the current forecast hour, verdict, board when present, and the existing
verdict explanation. It does not access subscription or Pro records.

The handler creates a fresh server per request and supports Streamable HTTP with
legacy protocol compatibility. MCP requests and preflight are routed before the
website's CORS handling. Browser CORS is disabled for this server-to-server
endpoint. No new binding, Durable Object or migration is required.

Verdicts use the existing CACHE binding with a five-minute TTL and an hourly key.
Malformed cache entries are discarded. KV failures fall back to a fresh forecast;
forecast failures return a tool error rather than an old or invented verdict.

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:unit` and
`pnpm --filter @tonnta/worker build` from the repository root. The worker build is
a dry run. Tests use forecast fixtures and do not contact live forecast services.

Deployment and connecting a remote MCP client require a separate approval. This
change does not deploy an endpoint or alter any existing client connection.
