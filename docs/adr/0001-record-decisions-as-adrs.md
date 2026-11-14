# 0001. Record architecture decisions as ADRs

- Status: Accepted
- Date: 2026-10-21

## Context

Tonnta spans a web app, a universal mobile app, home-screen widgets and a
Cloudflare Worker. Several choices in it look odd without their reason: a
hand-written SSE parser, Maestro outside EAS, two deploy targets for one site.
A reviewer or a new contributor reading the code cannot recover why.

## Decision

Record each architecture decision as a short numbered Markdown file in
`docs/adr/`, using [template.md](template.md). CodeRabbit reads these files as
review guidelines.

## Options rejected

- **PR descriptions only**: they scatter, and nobody searches closed PRs before
  changing something.
- **A wiki**: it drifts from the code it describes and is not reviewed with it.

## Consequences

A decision is reviewed in the same PR as the code that implements it. Changing
course means a new ADR that supersedes the old one, so the history stays
readable.
