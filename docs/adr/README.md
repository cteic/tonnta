# Architecture decision records

Each file records one decision: the context, what was chosen, what was rejected
and why, and what follows from it. An accepted ADR is never edited to change the
decision. A new ADR supersedes it and says so.

| ADR                                              | Decision                                              | Status   |
| ------------------------------------------------ | ----------------------------------------------------- | -------- |
| [0001](0001-record-decisions-as-adrs.md)         | Record architecture decisions as ADRs                 | Accepted |
| [0002](0002-cloudflare-for-web-and-api.md)       | Run the web app and the API on Cloudflare Workers     | Accepted |
| [0003](0003-expo-universal-app.md)               | One Expo Router codebase for iOS, Android and web     | Accepted |
| [0004](0004-sse-for-live-data.md)                | Server-Sent Events for live tide data                 | Accepted |
| [0005](0005-fingerprint-runtime-versions.md)     | Fingerprint runtime versions for over-the-air updates | Accepted |
| [0006](0006-home-screen-widgets.md)              | Home-screen widgets fed by a worker verdict timeline  | Accepted |
| [0007](0007-maestro-on-github-actions.md)        | Run Maestro end-to-end tests on GitHub Actions        | Accepted |
| [0008](0008-posthog-for-analytics-and-errors.md) | PostHog for product analytics and crash reports       | Accepted |
| [0009](0009-staging-and-production.md)           | Separate staging and production web deploys           | Accepted |

New ADR: copy [template.md](template.md), take the next number, and add a row
here.
