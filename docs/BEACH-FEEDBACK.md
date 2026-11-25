# Private beach checks

This web-only slice records actual visits without login, a server write or automatic calibration. No email, account, D1 migration or new service is required. `/log?spot=donabate` chooses the initial beach; the person can change it.

## What is recorded

A stable UUID identifies each check. Visit time is separate from submission time. The date/time input explicitly uses the selected beach's IANA timezone, even when the browser is elsewhere. Skipped daylight-saving times are rejected; repeated times require the person to choose the clock offset. Future observations are rejected.

The visit can be a beach check or a surf. Observed surf state (flat, small, rideable, messy) is separate from optional "good enough for me", good/grand/poor satisfaction, board and note. These categories are qualitative personal observations, not instrument measurements or water-safety judgments.

Legacy `tonnta.diary.v1` entries remain unchanged and visible unless explicitly removed with their delete control, labelled with unverified visit times. They are not silently migrated into accurate observations, matched to historical forecasts or used for calibration statistics. The former three-session "sweet spot" claim is not displayed.

## Forecast evidence

`captureForecastSnapshots` takes `{ spotId, checkedAt, capturedAt?, engineVersion, hours: [{ hour, verdict }] }` and produces snapshots. The surf screen captures retained full-daylight hourly assessments when opened. This does not claim every hour was individually displayed, or that the hourly verdict is identical to a partial-hour dawn/dusk hero.

The snapshot stores the exact hourly model inputs, effective spot thresholds/orientation/location/timezone, verdict/reason/board and `SURF_VERDICT_ENGINE_VERSION` (currently `donabate-short-period-v1`). SHA-256 IDs cover canonical contents, target hour, rules version and checked time. Later renders of the same assessment keep the original stored capture. The source-check timestamp is not upstream model issue time. The upstream model run/issuance is unknown; these are client-held records, not authenticated server evidence.

`readForecastSnapshots(storage)` and `persistForecastSnapshots(storage, snapshots)` return `{ ok: true, value }` or `{ ok: false, error }`. Snapshot storage keeps at most 4,096 records within a conservative 1 MiB UTF-16 estimate, evicting oldest records and reserving space for reports. Known quota failures trigger bounded further oldest-record eviction; corrupt/unavailable stores are not overwritten. A report embeds its chosen snapshot, so trimming history or a later forecast cannot replace the original evidence.

`matchForecastSnapshot(snapshots, spotId, observedAt)` requires the same beach, the exact containing target hour, and source-check/capture timestamps no later than the visit. It chooses the latest eligible capture. Saving freezes that comparison; absent evidence stays absent on reload. A newly fetched historical hour must never be offered as the forecast originally shown. Night and partial-daylight hours may have no snapshot.

## Privacy and resilience

Checks and snapshots stay in this browser's localStorage. No report is uploaded or automatically shared. JSON download exports the person's checks, embedded comparisons and legacy diary; the person controls what happens to that file. There is no cross-device sync or remote backup. Browser-data deletion removes this log, and same-device/browser users can access it.

Storage read/write errors are surfaced and never reported as a successful save. A corrupt beach-check store is not overwritten. Form values remain after failed saves. Forecast-history failure does not prevent a report without a comparison.

An already-open form can save without a forecast or network. Cold offline navigation is not supported by the existing service worker; it shows its offline safety page rather than caching a forecast. Full offline app installation/storage, native `/log`, private account login, authenticated sync, report import and a server-side issuance archive remain separate work.

## Manual review only

These checks can later support manual comparison by beach, observed time, saved assessment and rules version. Satisfaction is not physical forecast accuracy: a tiny day can still be good enough for a longboard. No competitor ratings are copied or treated as ground truth. Do not claim measured accuracy gains from this feature, or automatically change thresholds from sparse reports.

## Validation

Focused tests cover stable snapshot identity, immutable first capture, same-spot/hour and pre-visit matching, missing evidence, embedded comparisons surviving refresh, source-check versus capture time, storage failure, legacy preservation, separate satisfaction fields, future visits and daylight-saving ambiguity. Repository-wide formatting, lint, typecheck and tests must pass before publication. No publication is part of this local patch.
