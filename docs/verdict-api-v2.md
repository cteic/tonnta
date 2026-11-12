# Daylight-safe verdict API (schema version 2)

This is a breaking change to recommendation enums. As reviewed on 11 November
2026, [CTE-87](https://linear.app/cteic/issue/CTE-87/decide-whether-installed-v1-widgets-exist-before-shipping-the-v2)
is recorded Done, and PR #68 records that no widgets were installed outside
development; PR #74 integrates that change. This is the recorded inventory
decision, not a new device audit or permission to deploy. Recheck any distribution
changes before release. If v1 consumers now exist, producer rollout remains
blocked until they are verified upgraded or retired, or a separately reviewed
version-negotiation/compatibility path is implemented. Unknown versions and
unknown states in updated consumers must fail closed: show unavailable, never a
default positive verdict or board.

## GET /verdict

- The response now includes `schemaVersion: 2`.
- Each hour includes `daylight: boolean` and `validUntil` (ISO hour end).
- `verdict` is `go | maybe | flat | blown | dark`.
- An hour is daylight only if its **entire interval** is within sunrise/sunset.
  Sunrise/sunset-straddling hours are conservatively `dark`, even when part of
  the hour is light. Dark entries have no board and explicitly say to stay out
  of the water. Sea measurements remain available; they are not recommendations.
- Entries apply only for `time <= clock < validUntil`. Future entries are
  forecasts, not a live verdict. Do not carry an entry across its expiry.
- No current-hour coverage or upstream failure returns HTTP 502 with
  `{"error":"forecast unavailable"}`, rather than reporting flat or a future hour.
- KV keys use `verdict:v2:`. Legacy, malformed, wrong-spot, stale and
  daylight-inconsistent cached responses are ignored. HTTP cache lifetime is at
  most five minutes and ends no later than the next hour or freshness expiry.
- A downloaded timeline is not a fresh live data source indefinitely: stop live
  recommendations one hour after `generatedAt`, even if it includes later hours.
  Refresh the API and fail closed when the refresh cannot provide current data.

The old native decoder rejects an entire payload containing `dark`; its failed
refresh retains the previous widget, which can leave an old GO display. Thus
server-first publication is unsafe. Shipping an updated decoder that accepts v1
input only addresses new-client/old-server compatibility. It does not repair old
installations. Verify client migration and clearing/removing installed old widgets
before the server change. If migration cannot be verified, keep the producer
unpublished and design an explicit versioned transition.

Do not coerce darkness into a false flat/blown weather report. Updated consumers
supporting v1 input independently validate clock, freshness, coverage and full-hour
daylight, otherwise showing unavailable. The native refresh reads its clock after
the response completes, so a fresh server-generated timestamp is not incorrectly
judged against an earlier request-start time.

## MCP get_surf_conditions

Structured content now includes `schemaVersion: 2` and `evaluatedAt`, plus `validUntil`.
Treat an MCP result as live only while the clock is before `validUntil`: it is
bounded by the current hour end and one-hour data freshness, and a daylight
recommendation also expires at sunset. Unavailable results expire immediately.
`verdict` additionally supports `dark | unavailable`; `swimVerdict` also
supports those two states. Both prose and structured fields are recomputed
from forecast hours at the clock read **after** loading, never from an old
cached positive verdict.

Live MCP uses actual-clock daylight rather than full-hour daylight: sunrise
and sunset are inclusive in the shared astronomical helper; immediately after
sunset is dark. Stale data (one hour old), future-dated loads or missing current
coverage produce unavailable. A dark response retains current sea measurements
but contains no board or next-good-window recommendation. Unavailable responses
contain no current forecast measurements. Tide/buoy observations, when present,
are contextual data rather than permission to enter the water.

When present during daylight, `nextGoodWindow.end` is now the exclusive end of
the last forecast hour, matching the displayed clock range. It is not the start
of that final hour.

Consumers must handle both new states explicitly, avoid deriving a positive
recommendation from numeric measurements, and request fresh conditions before
using an older response as live advice.

## Additive surf decision evidence (CTE-103)

Schema v2 verdict enums, prose, scores and expiry behavior are unchanged. The
Worker now emits `evidenceVersion: 1`, `engineVersion` and `profileVersion` at the
timeline level, and `reasonCode` on each hour. MCP emits the same engine/profile
identity, a primary `reasonCode`, and `generatedAt` as an alias of `evaluatedAt`.
These fields describe surf only, not swim advice or water-quality clearance.

- Engine identity remains `donabate-short-period-v1`: no scoring rule changed.
- Profile identity is the version pinned in the existing spot registry provenance.
  It is `null` for custom or mismatched configurations. A version is not evidence
  of local calibration, independent validation or approval to expand the beta.
- Worker `generatedAt` is the retrieval/build clock, not upstream model issuance.
  MCP `generatedAt`/`evaluatedAt` is the response evaluation clock, not retrieval
  or issuance. Existing freshness checks still use the original data load clock.
- Per-hour `validUntil` remains the exclusive hour end. Timeline freshness still
  ends one hour after `generatedAt`; neither metadata nor future hours extends it.
  MCP `validUntil` retains its existing hour, freshness and sunset bounds.

Primary codes follow engine branch precedence, not all contributing factors:

- `thunderstorm`: thunderstorm override, including when other inputs are invalid.
- `invalid-forecast`: required surf inputs fail validation.
- `onshore-blown-out`: onshore/cross-on wind strictly exceeds the blown threshold.
- `flat-glassy`: below flat threshold with a glassy SUP board selection.
- `below-surf-height`: below flat threshold without that glassy SUP selection.
- `short-period-unconfirmed`: rideable height and acceptable wind, but period
  strictly below the configured minimum.
- `rideable-within-wind-limit`: rideable height and wind at/below its applicable
  limit, without the short-period uncertainty gate.
- `wind-above-limit`: rideable height but wind above its applicable limit.
- `borderline-height`: neither flat nor rideable height.

The Worker uses `outside-full-daylight-hour` before assessing the weather for
partly lit/dark intervals. MCP uses `outside-daylight` for actual-clock darkness
and `current-forecast-unavailable` for withheld current data; it does not guess
whether a generic unavailable result came from stale, missing or invalid data.
These are status reasons, not claims about surf conditions.

`assessHourWithReason` is the single scoring implementation. `assessHour` returns
its original result shape for existing callers and historical local snapshots.
No historical snapshot is retroactively labelled with new decision evidence.
Existing widget decoders ignore additive fields and retain their expiry guards.

Worker KV keys include engine, evidence revision and profile version. Prior v2
keys are not read. Entries lacking codes/evidence, carrying unknown codes,
wrong engine/profile identity, or failing existing time/daylight validation are
refetched, never upgraded by attaching current labels. Unversioned custom spot
configurations bypass KV reads and writes. Old native v1 migration/deployment
restrictions above are unchanged; this addition does not authorize rollout.
