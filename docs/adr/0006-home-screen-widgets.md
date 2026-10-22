# 0006. Home-screen widgets fed by a worker verdict timeline

- Status: Accepted
- Date: 2026-10-21

## Context

The fastest answer to "is it on?" is one glance at the home screen, without
opening the app. Widget code runs outside the app, with tight limits on network
access and refresh frequency on both platforms.

## Decision

- Widgets are built with `expo-widgets`: SwiftUI on iOS (small and medium),
  Glance on Android (2x2, resizable).
- The worker's `GET /verdict` returns the next 24 hours of verdicts in one
  response, cached in KV per spot and hour.
- iOS gets the whole day as a widget timeline, so it shows the right verdict
  each hour with no further fetch. Android gets the current hour.
- The app refreshes the widget on open, on return to the foreground, and from
  an hourly background task.

## Options rejected

- **The widget computing verdicts itself**: widget layouts can read only their
  props, so the engine cannot run there.
- **A widget-specific native networking layer per platform**: two
  implementations of one fetch.

## Consequences

- Widget layouts read only their props. CodeRabbit flags module-scope access in
  widget files.
- The verdict engine stays in one place, `packages/data`.
