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

## Irish surf beaches (added 27 November 2026)

Nine Republic of Ireland beaches join the registry as `ireland-surf-beta`.
Every value is provisional. None has been calibrated against beach
observations, and all use the default thresholds (flat below 0.3 m, GO from
0.4 m, wind 25/30/35 km/h).

How the values were found, on 27 November 2026:

- **Point:** the nearest OpenStreetMap coastline point to the surfed part of
  the beach, cross-checked against logainm.ie, surf-forecast.com and EPA points.
- **Facing:** the seaward bearing of the OSM coastline averaged over 300, 600
  and 1,000 m. Each was checked against surf-forecast.com's best wind
  direction; offshore (facing + 180) fell within about 45° every time.
- **Stations:** the nearest live station in the Marine Institute ERDDAP
  datasets `IWBNetwork`, `IMI-TidePrediction` and
  `IrishNationalTideGaugeNetwork`. A gauge more than about 40 km away, or on a
  different stretch of water, is left out.
- **EPA:** IDs from data.epa.ie, each present in `bathing-waters.generated.ts`.
- **Irish names:** logainm.ie. Names that logainm marks as not validated are
  left out (Strandhill's strand).

The north-west buoy M4 has not reported since 29 March 2026, so the Donegal,
Sligo and Mayo beaches have no buoy mapping. Do not map them to M4 until it is
back.

| id           | facing | buoy              | tide prediction        | gauge             | EPA                  |
| ------------ | ------ | ----------------- | ---------------------- | ----------------- | -------------------- |
| rossnowlagh  | 264    | none (M4 offline) | Killybegs              | Killybegs Port    | IENWBWC010_0000_0200 |
| strandhill   | 296    | none (M4 offline) | Sligo                  | Sligo             | none                 |
| keel-achill  | 224    | none (M4 offline) | Achill_Island_MODELLED | Roonagh Pier      | IEWEBWC250_0000_0200 |
| lahinch      | 235    | M3                | Lahinch_MODELLED       | Inishmore         | IESHBWC100_0000_0100 |
| inch-kerry   | 247    | M3                | Dingle                 | Dingle Harbour    | IESWBWC230_0000_0200 |
| brandon-bay  | 314    | M3                | Fenit                  | none              | none                 |
| inchydoney   | 153    | M3                | Union_Hall             | Union Hall Harbor | IESWBWC100_0000_0100 |
| garrettstown | 188    | M3                | Kinsale_MODELLED       | none              | IESWBWC090_0000_0200 |
| brittas-bay  | 113    | M2                | Arklow                 | none              | IEEABWC140_0000_0300 |

Each beach below has its own anchor for `spot-profiles.ts`.

### rossnowlagh

Beginner beach. Sources: logainm.ie/en/1166902; EPA IENWBWC010_0000_0200;
surf-forecast.com/breaks/Rossnowlagh (E offshore, W swell).

### strandhill

Intermediate; rocks in the lineup and swimming banned. Sources:
surf-forecast.com/breaks/Strandhill (SE offshore, WNW swell).

### keel-achill

Beginner to intermediate; rips. Sources: logainm.ie/en/1412694; EPA
IEWEBWC250_0000_0200; surf-forecast.com/breaks/Keel (NE wind, SW swell).

### lahinch

Beginner; rips and rocks. Sources: logainm.ie/en/1418805; EPA
IESHBWC100_0000_0100; surf-forecast.com/breaks/Lahinch. That page gives both E
and NE as the best wind; the coastline gives 235° facing (offshore 55°).

### inch-kerry

Beginner; one guide disagrees. EPA describes the beach as facing due west; the
mid-strand coastline gives 247°. Sources: logainm.ie/en/101233; EPA
IESWBWC230_0000_0200; surf-forecast.com/breaks/Inch-Strand.

### brandon-bay

Beginner on small days; rips when bigger. The EPA Castlegregory bathing water
faces into Tralee Bay, not this side, so it is not mapped. Sources:
logainm.ie/en/1394352; surf-forecast.com/breaks/Brandon-Bay_1.

### inchydoney

Beginner to intermediate; dangerous rips. Sources: logainm.ie/en/8973; EPA
IESWBWC100_0000_0100; surf-forecast.com/breaks/Inchydoney.

### garrettstown

Beginner to intermediate; rocks, groynes and rips. M3 is used over the nearer M5
because swell here arrives from the south-west. Sources: logainm.ie/en/11132;
EPA IESWBWC090_0000_0200; surf-forecast.com/breaks/Garrettstown.

### brittas-bay

Level unverified. Needs an easterly swell. Sources: logainm.ie/en/128813; EPA
IEEABWC140_0000_0300.

### Held back

- **Tullan Strand, Easkey, Enniscrone, Tramore:** the facing changes by up to
  30° depending on the stretch of coast measured, or could not be measured.
  Wind labels depend on facing, so these wait for a checked bearing.
- **Mullaghmore Head:** a big-wave reef for experts, not a beach. Do not add.

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
