# Surf accuracy: conservative first step

## What changed

The shared surf engine is versioned as `SURF_VERDICT_ENGINE_VERSION`, exported by
`@tonnta/data`. This revision is `donabate-short-period-v1`. Save the identifier,
spot and effective thresholds alongside a forecast snapshot; bump the identifier
when assessment rules change. It does not identify an upstream forecast model or
its issuance time.

Donabate now has an optional `minGoPeriodS` of 4 seconds. An hour that would
otherwise be GO below that period becomes MAYBE, without a board recommendation,
and explicitly says that breaking surf is unconfirmed. Valid flat conditions,
lightning warnings and blown-out wind keep their existing precedence. The rule
uses aggregate modeled mean wave period, not swell or peak period.

**Four seconds is a provisional conservative product rule, not a calibrated local
boundary.** It prevents confident short-period recommendations such as 0.5m at 3s
with 22km/h onshore wind. It neither proves those conditions are flat nor proves
that conditions at or above 4s are surfable. El Cotillo and Flag Beach retain their
existing rules. Personal “good enough” surf need not match another site's rating.

Required wave/wind values must be finite and nonnegative, with directions in
0–360 degrees. Positive wave height requires positive period. Invalid source
hours are omitted, allowing callers to represent missing coverage. A direct
engine call with invalid required inputs returns boardless MAYBE with an explicit
invalid-data explanation, never a claim of flat water. Signed Celsius temperatures
remain valid; optional null/missing readings do not invalidate required inputs.

## What the forecast represents

Open-Meteo's Marine API supplies regional modeled sea conditions. The request
selects no model explicitly and uses its Best Match default. Aggregate wave height
is not measured beach breaking-wave height. Separate wind-wave and swell fields
are available but are not used in this revision. Returned grid coordinates can
differ from the requested beach coordinates. See the
[official Marine API documentation](https://open-meteo.com/en/docs/marine-weather-api).

This adapter does not yet retain returned grid coordinates or model issuance.
A retrieval timestamp is when the app checked the source, not when a model run was
issued. `generationtime_ms` measures response processing time, not model age.
A freshly retrieved forecast is not a fresh observation of surf at the beach.

## Feedback and gated next work

Capture the observation's spot and time separately from submission time, plus
what was actually seen (flat, rideable or messy) separately from session enjoyment.
Link the exact forecast shown, its valid time, retrieval time, raw inputs, engine
version and effective thresholds where available. Later feedback about a beach
visit must not be silently paired with today's forecast. Keep missing historical
snapshots explicitly missing.

Collect observations across conditions before tuning local exposure, sheltering,
period/height response, tide effects, gust rules or model choice. Offshore buoy
readings can provide context, but are not interchangeable with beach surf. Do not
automatically retrain or change thresholds from a single report. Evaluate false-GO
rates, missed surf and sample counts by spot and forecast lead time, with held-out
observations, before claiming improvement. Any personal preference adjustments
should remain distinct from physical forecast calibration and safety warnings.

This change does not establish the precise cause of the reported weekend miss.
That needs the visit time, spot, deployed rules and original forecast evidence.
