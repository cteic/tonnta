# Tonnta

**Tonnta** (Irish: _waves_) — a surf-conditions companion for Donabate, Co. Dublin.

**Live at [tonnta.surf](https://tonnta.surf)**

One question, answered in five seconds: **is it worth going down, and what board do I
bring?**

- **Verdict, not a data table** — GO / MAYBE / FLAT / BLOWN OUT, driven by live wave
  and wind conditions for Donabate beach
- **Board call** — SUP, foamie or longboard, with the reasoning
- **Alerts** — get pinged when it's on (waves ≥ 0.4 m and the wind behaves)
- **Live sea state** — nearby buoy observations, tides and sea temperature

## Stack

pnpm + Turborepo monorepo · React / React Native · Tamagui · Zustand · Next.js
(App Router) · Cloudflare (Pages, Workers, KV, D1) · data from Marine Institute,
Met Éireann and Open-Meteo

## Development

```sh
pnpm install
pnpm dev:web
```

`main` is production; `dev` is the default integration branch. Feature branches
(`feat/*`, `fix/*`, `chore/*`) branch off `dev` and PR back to `dev`.

## Docs

- [Design direction](docs/DESIGN.md)

## Licence

Copyright (c) 2026 Pete Watters. Licensed under the GNU Affero General Public License v3.0 only (AGPL-3.0-only). See [LICENSE](./LICENSE).

A commercial licence for use without the AGPL obligations is available from cteic. Contact [Pete Watters](https://github.com/pete-watters).
