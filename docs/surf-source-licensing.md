# Surf source and licensing matrix

CTE-102 research baseline. Checked **11 November 2026**, against checkout
`ba76d7101754120ac285e1ac07cd6c5a99711a7c` and the official pages linked below.
This is an engineering evidence register, not a legal opinion or a claim that
production use has been approved. No subscription, account, permission request,
terms acceptance, or deployment was performed.

## Scope and decision

The surf implementation consumes Open-Meteo Marine and Weather Forecast APIs and
three Marine Institute ERDDAP datasets. EPA/swim sources are outside this review.
Met Éireann appears in the surf footer, but there is no separate Met Éireann
adapter: it is a collaborator in the Irish weather-buoy network, not an additional
forecast endpoint in this checkout.

- **Verified data licences:** Open-Meteo API output and each of the three exact
  Marine Institute datasets declare CC BY 4.0.
- **Commercial hosted-service blocker:** Open-Meteo's free endpoints are restricted
  to non-commercial use. Their open data licence does not remove this restriction.
  The adapter currently uses those free endpoints, without customer credentials.
- **Attribution work remains:** the web footer names providers and licences as
  plain text. It does not supply the adjacent Open-Meteo link required by the
  provider's licence page, a licence link, or model-specific credits.
- **Endpoint operating terms remain partly unresolved:** this research establishes
  Marine Institute dataset reuse terms, not a guaranteed request allowance, SLA,
  or permission for unlimited bulk access.

## Source inventory

Field names below are the actual requested fields, not a proposed expanded feed.

| Source and endpoint                                                                             | Fields and units used                                                                                                                               | Coverage and role                                                                                                                                    | Tonnta refresh/cache behavior                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open-Meteo Marine: `https://marine-api.open-meteo.com/v1/marine`                                | `time` UTC; `wave_height` m; `wave_period` s; `wave_direction` degrees from; `sea_surface_temperature` °C                                           | Spot coordinates; seven days of hourly regional modeled sea conditions. Default Best Match, no explicit model. Not local breaking-wave measurements. | Web fetch revalidation 900 s. Native calls upstream directly. Worker verdict cache 900 s. Alert cron fetches for subscribed spots hourly, 05:00–20:00 UTC.     |
| Open-Meteo Weather: `https://api.open-meteo.com/v1/forecast`                                    | `time` UTC; `wind_speed_10m`, `wind_gusts_10m` explicitly requested in km/h; `wind_direction_10m` degrees; `weather_code` unitless                  | Seven days hourly, joined to marine records by timestamp. Weather code is optional in parsing.                                                       | Same lifecycle as Marine; each forecast assembly makes two HTTP requests.                                                                                      |
| Marine Institute: `https://erddap.marine.ie/erddap/tabledap/IWBNetwork.json`                    | `time`, `station_id`, `WaveHeight` m, `WavePeriod` s, `WindSpeed` knots converted ×1.852 to km/h, `WindDirection` degrees true, `SeaTemperature` °C | Donabate uses M2. Latest timestamp from a two-day query. Offshore observation, not beach surf.                                                       | Web revalidation 600 s. Native assembly fetches directly. Provider metadata describes hourly wind reporting.                                                   |
| Marine Institute: `https://erddap.marine.ie/erddap/tabledap/IMI_TidePrediction_HighLow.json`    | `time`, `stationID`, `tide_time_category`, `Water_Level_ODMalin` m, OD Malin datum                                                                  | Donabate uses Skerries. Three-day future high/low event query. Predictions, not gauge observations.                                                  | Web revalidation 900 s; native assembly directly. Re-fetching predictions is not evidence of a new prediction run.                                             |
| Marine Institute: `https://erddap.marine.ie/erddap/tabledap/IrishNationalTideGaugeNetwork.json` | `time`, `station_id`, `Water_Level_OD_Malin` m, OD Malin datum                                                                                      | Donabate uses Skerries Harbour; default last 60 minutes, chronological readings.                                                                     | Worker live stream polls each 60 s, with 60 s KV entries. Provider sampling is 5 minutes. Cache sharing is best effort, not an atomic single-flight guarantee. |

Donabate is the only registry entry with Marine Institute station mappings. El
Cotillo and Corralejo use the Open-Meteo forecasts without those mapped MI feeds.
Native direct fetch describes the assembly path, not a verified background
refresh schedule. Cache intervals describe source code, not measured production
freshness.

## Licence and access evidence

| Dataset/service                | Verified evidence                                                                                                                                                                                                                         | Reuse and attribution                                                                                                     | Remaining qualification                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open-Meteo API data            | [Official licence](https://open-meteo.com/en/licence) declares CC BY 4.0 and requires a link beside displayed data.                                                                                                                       | Credit Open-Meteo, link source and licence, identify transformations. Model-provider attribution also applies; see below. | API server software is separately AGPL. Consuming JSON does not establish that Tonnta itself must use AGPL. Self-hosting needs its own review.        |
| Open-Meteo hosted free service | [Terms](https://open-meteo.com/en/terms) restrict free service to non-commercial purposes, with limits below 10,000/day, 5,000/hour and 600/minute. Advertising, subscriptions and commercial products are listed as commercial examples. | Data rights and service access are separate.                                                                              | Do not treat a free-facing app or low request count as proof of non-commercial eligibility. Confirm Tonnta's actual use.                              |
| Open-Meteo commercial service  | [Pricing](https://open-meteo.com/en/pricing) describes paid commercial access, API keys and customer endpoints; Marine is included in the listed plans.                                                                                   | Use an authorized commercial arrangement before commercial hosted use.                                                    | No account entitlement or purchase was checked. Verify exact marine/weather customer URLs and budget when implementing; keep credentials server-side. |
| IWBNetwork                     | [Exact dataset metadata](https://erddap.marine.ie/erddap/info/IWBNetwork/index.html), global `license`: CC BY 4.0.                                                                                                                        | Credit Marine Institute; retain network acknowledgements, including Met Éireann collaboration, in source details.         | Do not confuse this dataset with `IWaveBNetwork`, which the adapter does not use.                                                                     |
| IMI_TidePrediction_HighLow     | [Exact dataset metadata](https://erddap.marine.ie/erddap/info/IMI_TidePrediction_HighLow/index.html), global `license`: CC BY 4.0.                                                                                                        | Credit Marine Institute, link dataset and licence, distinguish predictions and derived displays.                          | Variable-specific datum overrides an imprecise reading of the summary; see below.                                                                     |
| IrishNationalTideGaugeNetwork  | [Exact dataset metadata](https://erddap.marine.ie/erddap/info/IrishNationalTideGaugeNetwork/index.html), global `license` and `license_URL`: CC BY 4.0.                                                                                   | Credit Marine Institute, link dataset and licence, distinguish observations.                                              | Sampling frequency is not publication latency or guaranteed availability.                                                                             |

[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) permits sharing and
adaptation, including commercial reuse, subject to attribution, licence linking,
change disclosure and no additional restrictions on licensed material. It does
not imply endorsement or guarantee all other permissions. Preserve supplied
credit and disclaimer notices where applicable.

[Marine Institute ERDDAP legal notices](https://erddap.marine.ie/erddap/legal.html)
direct users to each dataset's licence and disclaim warranties and endorsement.
No numerical request quota, commercial-service SLA, or separate bulk-access
entitlement was established on the pages reviewed. Public/keyless availability
alone is not evidence for any of those rights. Check with the provider if the
planned traffic or redistribution service needs an operational agreement; no
contact was made during this task.

## Attribution and provenance implementation checklist

1. Add an accessible source/credits destination and adjacent linked Open-Meteo
   credit on web, native and applicable widget displays. Link CC BY 4.0 and the
   exact MI datasets. Current footer text is not a complete implementation.
2. The [Marine API citation section](https://open-meteo.com/en/docs/marine-weather-api)
   requires credit to the model providers used as well as Open-Meteo. Best Match
   is not a model identity. Determine and record actual model selection per
   variable/location before finalizing provider credits. Include the required
   Copernicus acknowledgement when its marine products are used. Do not invent
   a model choice from coordinates alone.
3. Describe Tonnta's changes: timestamp normalization, wind-unit conversion,
   filtering, aggregation and locally calculated verdicts. State that verdicts
   are Tonnta's interpretation, not provider endorsement.
4. Record separate observation/valid time, fetch time, cache age and model issue
   time when available. The adapter currently discards returned grid coordinates
   and does not retain model issuance. A retrieval time is not a model run time.
5. Audit native and widget credits separately; this review inspected the web
   footer and adapters, not every rendered surface.

## Accuracy issues revealed by the source review

- **Tide datum:** the prediction dataset summary mentions LAT, but the requested
  `Water_Level_ODMalin` variable explicitly identifies **OD Malin**. The gauge's
  `Water_Level_OD_Malin` does too. The baseline UI incorrectly said “heights vs
  mean sea level”; the correction documented below replaces that label.
  Preserve the named vertical datum in the contract and obtain a defensible
  display explanation rather than silently equating LAT, OD Malin and local MSL.
  Do not apply an unverified offset.
- **Model refresh:** the web cache comment says models update six-hourly. The
  official Marine documentation lists different cadences, including 6, 12 and
  24 hours depending on source/variable. An hourly output grid is not an hourly
  model update. Best Match does not justify one universal cadence.
- **Quality flags:** buoy/gauge metadata exposes quality flags; current requests
  omit them. Treat finite-value parsing as parsing, not upstream quality
  assurance. Track quality-flag handling separately from this licence task.
- **Horizon:** the ERDDAP adapter comment claims predictions through January 2029. This review did not verify the live dataset's full latest horizon; do not
  advertise that date without a bounded data query and evidence.

## Code references and completion boundary

- `packages/data/src/sources/open-meteo.ts`: endpoints, requested variables,
  normalization, joins and optional fields.
- `packages/data/src/sources/erddap.ts`: exact dataset IDs, station filters,
  lookback windows, conversions and tide fields.
- `packages/data/src/spots.ts`: location/station mapping.
- `packages/web-conditions/src/conditions.ts`: 900/600-second fetch policies.
- `apps/app/src/lib/conditions.ts`: native direct assembly.
- `apps/worker/src/{live,verdict,index}.ts` and `apps/worker/wrangler.toml`: live
  polling, KV cache and scheduled forecast reads.
- `apps/web/src/components/app-footer.tsx`: existing provider notice.
- `packages/web-conditions/src/forecast-sections.tsx`: tide-height label.

This document completes the source inventory and evidence baseline. It does not
complete commercial migration, attribution UI, datum conversions, rate testing, or
provider confirmation. Re-check linked terms before launch or monetization, when
selecting new datasets/models, and whenever provider terms materially change.

## Tide datum correction (verified 13 November 2026)

The shared web forecast and native live-gauge card must say **relative to OD
Malin**, not mean sea level. The adapter passes through signed metre values;
this label correction does not change heights, tide times, trends or scoring.
The MCP text also names OD Malin; its next-event payload adds `datum: "OD Malin"`
alongside the unchanged `heightM` value.

- [Prediction variable metadata](https://erddap.marine.ie/erddap/info/IMI_TidePrediction_HighLow/index.html):
  the selected `Water_Level_ODMalin` declares `sea_level_datum: OD Malin` and
  `units: metres`. The dataset-wide summary mentions LAT, but that does not
  describe the selected OD Malin column.
- [Gauge variable metadata](https://erddap.marine.ie/erddap/info/IrishNationalTideGaugeNetwork/index.html):
  the selected `Water_Level_OD_Malin` declares `sea_level_datum: Ordnance Datum
Malin (OD Malin)` and `units: metres`.
- Donabate uses prediction station `Skerries` and gauge `Skerries Harbour`;
  official distinct station rows return latitude/longitude `53.585, -6.108117`
  and `53.585, -6.1081`, respectively. These remain nearby reference stations,
  not measurements at Donabate beach. Reproduce with `stationID,latitude,longitude`
  filtered to `stationID="Skerries"` in the prediction table, and
  `station_id,latitude,longitude` filtered to `station_id="Skerries Harbour"`
  in the observation table, each with `distinct()`. The selected height variable
  metadata applies to these rows; station identity does not supply a datum offset.

OD Malin is not interchangeable with a station's local mean sea level or Lowest
Astronomical Tide (LAT). No station-specific conversion has been established
here, so none is applied. These values must not be presented as depth above the
seabed. Adapter regressions deliberately include differing LAT and OD Malin
columns, negative heights and missing OD Malin columns. Web tests render the
forecast label and empty state; the native label regression is a source-level
check, not a device acceptance test.
