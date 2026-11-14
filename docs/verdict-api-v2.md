# Daylight-safe verdict API (schema version 2)

This is a breaking change to recommendation enums. **Producer rollout is blocked**
until every existing v1 consumer is verified upgraded or retired, or a separately
reviewed version-negotiation/compatibility path is implemented. No installation
inventory has been verified in this work. Unknown versions and unknown states in
updated consumers must fail closed: show unavailable, never a default positive
verdict or board.

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
