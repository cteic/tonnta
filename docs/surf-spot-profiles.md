# Surf spot profile baseline

CTE-102, reviewed 11 November 2026 against PR #74 (`ba76d71`). This is a
versioned inventory of existing configuration, not a newly calibrated model or
approval to expand the beta. No coordinates, thresholds, station assignments or
visible spot list change here.

## Scope and provenance

ASSUMPTION: Donabate is the initial beta candidate because the repository calls it
the launch/default spot. The agreed beta list has not been independently recorded
in this ticket. El Cotillo and Corralejo already exist; keep them inventoried but
unconfirmed for beta rather than silently treating them as approved additions.

`packages/data/src/spots.ts` is the primary source for every numeric value below.
It does not cite surveys, beach orientation measurements, or calibration data.
The original source of those choices is therefore **unknown**. The profiles pass
structural checks, not empirical validation. `spot-profiles.ts` records separate
profile versions; bump the affected version and its pinned test whenever scoring
inputs or station mappings change. The engine version remains separate. These
metadata are not yet emitted by the v2 worker or persisted in beach-check records.

### Donabate

- Version: `donabate-v1`; 53.487, -6.107; `Europe/Dublin`.
- Facing: 70° true (ENE), a configured approximation, not a measured transect.
- Exposure/shelter response: unknown; no calibrated exposure factor exists.
- Thresholds: flat below 0.3 m; GO from 0.4 m; minimum GO period 4 s;
  max wind 25 km/h, max offshore wind 30 km/h, blown onshore above 35 km/h.
- Buoy: M2; predictions: Skerries; gauge: Skerries Harbour. These are regional
  proxies, not observations at the beach. Distance/representativeness and tidal
  phase/datum transfer have not been validated.
- The 4 s rule is a provisional uncertainty guard, not a proven surfability
  boundary. See [the accuracy notes](SURF-ACCURACY.md).

### El Cotillo

- Version: `el-cotillo-v1`; 28.674, -14.017; `Atlantic/Canary`.
- Facing: 275° true. Registry comment identifies Piedra Playa facing west.
- Exposure/shelter response: unknown; open-Atlantic description is a registry
  assumption, not an implemented or validated coefficient.
- Thresholds: flat below 0.6 m; GO from 0.8 m; no configured minimum GO period
  (so no local period guard); wind limits 25/30/35 km/h.
- No buoy, tide-prediction or gauge mapping exists. Do not invent these readings.

### Corralejo

- Version: `corralejo-v1`; 28.712, -13.833; `Atlantic/Canary`.
- Facing: 65° true. Registry comment identifies Flag Beach facing ENE across the
  Lobos channel; exact point and bearing remain unverified.
- Exposure/shelter response: unknown; no calibrated coefficient.
- Thresholds and missing station mappings are the same as El Cotillo.

## Validation and remaining evidence

The profile tests require unique IDs, valid coordinate/bearing ranges, recognized
IANA timezones, positive ordered thresholds, complete provenance, and pinned
versions/configuration. This catches accidental drift and malformed inputs; it
cannot prove local geography or useful surf recommendations.

Before marking CTE-102 complete, record the chosen beta list, verify the beach
points and approximate orientation against a cited geographic source, and gather
representative beach observations. Keep uncertain exposure and response values
unknown until supported. Do not tune thresholds from this inventory. The source/licensing evidence inventory belongs to CTE-102; licence and
hosted-service decisions remain in CTE-91. See the
[source licensing matrix](surf-source-licensing.md).
