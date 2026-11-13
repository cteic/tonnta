# Tonnta — agent instructions

Tonnta (Irish: _waves_) is a surf-conditions companion for Donabate, Co. Dublin.
It answers one question in five seconds: is it worth going down, and what board
do I bring?

## Scoped instruction files

This is the only instruction file in the repo. Don't add a directory-scoped
`CLAUDE.md` or `AGENTS.md` yet — the packages here share one set of rules, and a
second file would only drift from this one. When a package earns genuinely
different hard rules, add its file then and state the boundary in it.

`AGENTS.md` is a symlink to this file, so tools reading either name get the same
rules.

Standing rules that apply everywhere — attribution, commit authorship,
confidentiality, secrets, verification before "done" — are global and are
deliberately not repeated here.

## Stack

- **Web:** Next.js (App Router), pinned to a version the Cloudflare adapter supports
- **Styling:** Tamagui — the only styling library
- **Worker:** Cloudflare Worker for data fetching and caching
- **Monorepo:** Turborepo + pnpm workspaces
- **Deploy:** Cloudflare

## Structure

```
apps/
  web/       Next.js app: tonnta.surf
  swim-web/  Next.js app: snamh.app, the swim site
  worker/    Cloudflare Worker — conditions data + cache
packages/
  data/      forecast/tide/buoy data access
  types/     shared domain types
  ui/        Tamagui components and tokens
  web-shell/ root document, fonts, themes and page chrome shared by every website
  web-conditions/ spot conditions loader, formatters and conditions UI for the websites
  {eslint,prettier,tsconfig}-config/
```

Apps depend on packages; packages never depend on apps. Domain logic belongs in
`packages/data`, not in a route handler.

## Commands

```sh
pnpm dev:web         # Next.js
pnpm dev:worker      # Wrangler
pnpm build:packages  # build packages before the apps
```

## Branching

`dev` is the integration branch and the repo default; feature branches come off
`dev` and PR back to it. `main` is production.

## Verification

```sh
pnpm format && pnpm lint && pnpm typecheck && pnpm test:unit
```

## Domain notes

- Marine Institute tide heights are metres relative to OD Malin. Label that
  datum explicitly; do not relabel as local mean sea level or LAT, or convert
  without a verified station-specific transformation.
- Conditions are a judgement call built from several sources. When they
  disagree, show the disagreement rather than averaging it away.
