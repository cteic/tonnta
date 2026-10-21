# 0008. PostHog for product analytics and crash reports

- Status: Accepted
- Date: 2026-10-21

## Context

A production app needs to know which screens get used and when it crashes.
Running two vendors (one for analytics, one for errors) doubles the setup and
the bills.

## Decision

PostHog (US cloud) through `posthog-react-native` covers both:

- screen views, app lifecycle events, and named events such as
  `outlook_viewed` and `chart_scrubbed`
- uncaught exceptions, unhandled promise rejections and render errors

There is no session replay, no touch autocapture, and nothing that identifies a
person. Development builds send nothing unless `EXPO_PUBLIC_POSTHOG_DEV=1`.

## Options rejected

- **Sentry for errors plus a separate analytics tool**: two SDKs and two
  bills. Sentry's error tooling is deeper, which this app does not yet need.

## Consequences

- One SDK, one dashboard, within the free tier at current traffic.
- Stack traces stay minified until source maps upload at build time, which
  needs `posthog-cli` and an API key in the build environment.
- We revisit if crash triage needs release health or performance tracing.
