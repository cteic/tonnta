# 0002. Run the web app and the API on Cloudflare Workers

- Status: Accepted
- Date: 2026-10-21

## Context

Tonnta reads public marine data (Marine Institute ERDDAP, Open-Meteo) that
changes every few minutes, and serves it to a web app, a mobile app and
widgets. The upstream services are slow and rate limited, so every client
hitting them directly does not scale. The project runs on a small budget.

## Decision

- The Next.js web app runs on Cloudflare Workers through the OpenNext adapter.
- A second Worker, `apps/worker`, is the API. It owns every upstream call and
  caches the results in KV, keyed by spot and hour or minute.
- Alert subscriptions live in D1. A cron trigger checks conditions hourly
  during session time and sends web push alerts.

## Options rejected

- **Vercel for the web app**: a second platform and bill, for no gain over one
  provider for web, API, cache and database.
- **Clients calling upstream APIs directly**: no shared cache, upstream rate
  limits hit per user, and no single place to validate the data.

## Consequences

- One shared fetch serves every client. For example, all open live streams for
  one tide gauge share one upstream request per minute.
- The free and low tiers cover current traffic.
- Next.js upgrades wait for adapter support. Next 15.5 was rejected by the
  adapter until the web app moved to Next 16.
