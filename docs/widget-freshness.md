# Widget freshness and safe fallback

## iOS

The widget receives a bounded timeline with an unavailable entry at every gap, at
an entry's validity limit, and at source expiry. Source expiry is one hour after
`generatedAt`, regardless of the forecast horizon. This prevents a final daytime
GO entry from being the intentional terminal state forever. Partial-daylight
hours never display GO. Each displayed forecast includes its weekday and time
range; a shorter validity limit is reflected in that range.

The SDK hands those entries to WidgetKit. Real-device testing must confirm the
actual scheduling, background, timezone and upgrade behavior. The application
cannot guarantee the operating system repaints at an exact millisecond.

## Android

The installed Expo SDK explicitly supports `updateTimeline` only on iOS and
silently does nothing on Android. Android background work is opportunistic, so a
JavaScript timeout cannot safely expire a persistent snapshot while the app is
asleep or killed.

The launch fallback therefore uses a non-actionable widget: **Open Tonnta**, a
**Forecast only** label, the forecast's day/time range and measurements, with a
prompt to check the app before entering the water. It never shows GO, a positive
swim verdict or a board recommendation, even immediately after a successful
fetch. This is a deliberate safety/feature tradeoff, not a claim that Android
snapshots now support exact expiry. Current recommendations remain in the app.

## Refresh and validation

- Clear the previous widget before waiting on a new network request. Network,
  malformed data, empty coverage and stale responses leave an explicit update
  prompt instead of a previous positive verdict.
- Re-evaluate against the completion clock after fetching; requests crossing an
  hour or freshness boundary must not revive an expired recommendation.
- Bound both response headers and response-body parsing to 15 seconds. If the
  native widget write fails, return failure; do not report the update as done.
- Request background refresh at a 15-minute minimum interval, while recognizing
  the OS can delay or skip it. Safety does not depend on that request running.
- Understand v2 dark states and validity fields. During rollout, legacy v1 data
  is independently checked for full-hour daylight, freshness and current
  coverage. Unknown spots, malformed timestamps, unsupported versions and
  inconsistent v2 daylight states fail closed.

The v2 API must not be published until existing v1 consumers have been verified
upgraded or retired, or a separately reviewed compatibility path exists. Old
clients reject the new darkness state and keep their old widget after failure.
See `verdict-api-v2.md`; no existing-install inventory has been verified.

Before store release, test installed-widget upgrades and opening the updated app
once, failed requests, killed apps, disabled background refresh, sunset, midnight,
clock changes and return from long suspension on physical iOS and Android devices.
