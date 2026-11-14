# 0009. Separate staging and production web deploys

- Status: Accepted
- Date: 2026-10-21

## Context

Every push to `dev` deployed the one `tonnta-web` worker, so an unreleased
change reached the only public site. The repository follows GitFlow: `dev`
integrates, `main` is production.

## Decision

- Pushes to `main` deploy `tonnta-web`, served on `tonnta.surf` and
  `www.tonnta.surf` as Cloudflare custom domains.
- Pushes to `dev` deploy `tonnta-web-staging`, a separate worker on
  workers.dev, defined as the `staging` environment in `apps/web/wrangler.jsonc`.
- PRs upload a preview version and comment its URL.

## Options rejected

- **One worker for both**: production changes with every merge to `dev`.
- **Cloudflare Pages branch deploys**: the web app runs on Workers through
  OpenNext, and Workers environments do the same job there.

## Consequences

- A release is a `dev` to `main` PR, and only that changes `tonnta.surf`.
- The API worker still has one deployment. A staging API needs its own KV
  namespace and D1 database first.
