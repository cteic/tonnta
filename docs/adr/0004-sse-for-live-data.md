# 0004. Server-Sent Events for live tide data

- Status: Accepted
- Date: 2026-10-21

## Context

The home screen shows the spot's tide gauge live. The gauge (Skerries Harbour
for Donabate) reports every 5 minutes. Data flows one way: server to phone. The
phone sends nothing back.

## Decision

The worker serves `GET /live` as a Server-Sent Events stream:

- a `snapshot` event with the last hour of readings on connect
- a `reading` event for each new gauge reading
- a comment heartbeat every 20 seconds so proxies keep the connection open
- a `retry` field, and the stream closes after 15 minutes so no invocation runs
  unbounded

Every stream reads the gauge through a 60-second KV cache. React Native has no
`EventSource`, so the app reads the stream with `expo/fetch` and parses it with
its own WHATWG-compliant parser (`apps/app/src/live/sse.ts`). The hook holds the
connection only while the app is in the foreground, reconnects when the server
closes the stream, and backs off on failure.

## Options rejected

- **WebSockets**: two-way, which this data does not need. They need a stateful
  server (a Durable Object on Cloudflare) and hand-written reconnect logic.
  SSE is plain HTTP, so caching, CORS and reconnects work as for any request.
- **Polling**: simpler, but each poll is a full request and the screen lags by
  up to one polling interval.
- **gRPC streaming**: no first-class support in React Native or Workers, and
  binary framing buys nothing for a few readings an hour.

## Consequences

- Upstream load does not grow with users: one gauge fetch per minute serves
  every open stream.
- A dropped connection recovers on its own.
- We revisit this when a feature needs the phone to send data in real time, for
  example live "who's in the water" presence. That would use a WebSocket on a
  Durable Object, alongside this stream rather than replacing it.
