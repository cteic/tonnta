# 0003. One Expo Router codebase for iOS, Android and web

- Status: Accepted
- Date: 2026-10-21

## Context

Tonnta needs a phone app for the five-second check on the way to the beach,
and widgets on the home screen. One developer maintains it, so two native
codebases are not an option.

## Decision

`apps/app` is an Expo Router app (SDK 58, React Native 0.88) styled with
Tamagui, shipping to iOS, Android and the web from one codebase. Domain logic
stays in `packages/data`, shared with the web app and the worker. Native
projects are generated from `app.json` (continuous native generation) and are
not committed.

## Options rejected

- **Separate Swift and Kotlin apps**: two codebases for one developer.
- **A web app wrapped in a native shell**: no real widgets, background tasks or
  native feel.

## Consequences

- One component library (`packages/ui`) and one verdict engine serve every
  platform.
- `app.json` is the source of truth for native config. A plugin change there
  needs a new native build, see [0005](0005-fingerprint-runtime-versions.md).
- React Native lacks some web APIs, for example `EventSource`, see
  [0004](0004-sse-for-live-data.md).
