# Tonnta — design direction

**Tonnta** (Irish: _waves_). A single-spot surf companion for Donabate that answers one
question in under five seconds: **is it worth going down, and what board do I bring?**

## Why this can't look like a weather app

Surf-forecast.com is a data table with ads. Surfline is a corporate dashboard that
barely knows Donabate exists. Tonnta wins by being _of this place_: the Irish Sea is
not tropical-blue — it's cold green-grey water under silver light, and the app should
feel like that. The Irish-language name is the brand; we use Irish as a quiet layer of
identity (eyebrow labels, verdict words), never as a gimmick.

## The one memorable thing (signature)

**The living sea-state hero.** The top of the screen is a full-bleed animated sea
surface (layered SVG/canvas sine bands, GPU-cheap) whose _amplitude, chop and colour
are driven by the actual current conditions_:

- Flat/glassy → near-still shimmer, pale sea-glass
- Clean 0.5m rollers → slow, ordered rolling bands
- Onshore mess → short, jittery, desaturated chop

The verdict sits on top of it in display type: **GO / MAYBE / FLAT / BLOWN OUT**, with
the Irish eyebrow above it (_Téigh · B'fhéidir · Ciúin · Séidte_). The sea surface IS
the data visualisation. Nobody else has this; it's honest (driven by real numbers) and
it makes checking the app a small daily pleasure. Respect `prefers-reduced-motion`
(static gradient snapshot).

Everything else stays quiet and disciplined so the hero carries the personality.

## Palette — "Irish Sea, dawn patrol"

| Token        | Hex       | Use                                        |
| ------------ | --------- | ------------------------------------------ |
| `harbour`    | `#0C1B22` | Dark bg / ink text on light                |
| `seaGlass`   | `#8FC1B5` | Good-conditions sea, positive accents      |
| `slateSwell` | `#3E5C66` | Mid sea tones, secondary text, borders     |
| `fog`        | `#E8ECEB` | Light bg / text on dark                    |
| `dawnAmber`  | `#E8A33D` | THE signal colour: GO verdict, alerts, CTA |
| `kelpRed`    | `#C4553B` | Blown-out / warnings only                  |

Dark-first (people check at 6am in bed), full light theme too. `dawnAmber` is spent
_only_ on the verdict and alert moments — scarcity keeps it meaningful.

## Type

- **Display** — Clash Display (Fontshare, free): verdicts, wave heights, the big
  numbers. Confident geometry, slightly nautical, not the default serif everyone ships.
- **Body/UI** — General Sans (Fontshare): labels, copy, settings.
- **Data** — Spline Sans Mono: forecast tables, tide times, buoy readouts —
  tabular numerals, reads like an instrument.

Scale: verdict ~clamp(3.5rem–6rem); wave height numbers big with small unit labels;
everything else restrained.

## Layout (mobile-first, single column)

```
┌──────────────────────────────┐
│  ~ living sea-state hero ~   │  ← animated, condition-driven
│  TÉIGH · GO                  │
│  0.6m @ 5s · cross-off 12km/h│
│  [ Longboard day ]           │  ← board pill: SUP / Foamie / Longboard
├──────────────────────────────┤
│  Next good window            │  ← "Sat 07:00–10:00 · 0.5m, off 8km/h"
├──────────────────────────────┤
│  7-day strip (tap → hourly)  │  ← mini sea-state swatches per day
├──────────────────────────────┤
│  Now at the buoy · tides     │  ← live obs, tide curve, sea temp
├──────────────────────────────┤
│  Alert bell → thresholds     │
└──────────────────────────────┘
```

## Verdict + board rules (v1, tunable in settings)

- **FLAT** (_Ciúin_): waves < 0.3m → "SUP if it's glassy"
- **GO** (_Téigh_): waves ≥ 0.4m AND wind ≤ 25 km/h (≤ 30 if offshore W/SW)
- **MAYBE** (_B'fhéidir_): 0.3–0.4m, or good waves with marginal wind
- **BLOWN OUT** (_Séidte_): wind > 35 km/h onshore (NE/E/SE), any wave height

Board pick: SUP → flat–0.4m & wind ≤ 15; Foamie → 0.4–0.8m any state that's a GO;
Longboard → 0.5–1.2m with period ≥ 5s and wind ≤ 20. Show one primary pick + why.

Donabate faces E/NE: W–SW wind = offshore (clean), NE–E–SE = onshore (messy).

## Copy voice

Plain, local, a bit warm. "Worth a look after work — 0.5m and the wind drops at 4."
Errors say what happened: "The buoy hasn't reported since 09:00 — forecast only."
Never weather-bureau speak, never surf-bro speak.

## Quality floor

Responsive to 320px, visible focus rings, reduced motion respected, WCAG AA contrast
in both themes, works as installed PWA (this is a check-it-daily app).

## Themes (Cuma)

The three redesign directions from the design review ship as selectable looks
over one skeleton: components read tokens from the active theme
(`apps/web/src/themes/registry.ts`), and only the hero is per-theme.

- **Éirí** (default) — the dawn window. A solar engine
  (`themes/eiri/solar.ts`, NOAA sun-position approximation) paints the hero
  sky for the current minute at the spot: pre-dawn indigo, sunrise gold, flat
  Irish daylight, sunset copper, moonlit night. Verdict text colour is chosen
  per phase to stay AA-legible; the living sea bands roll below the horizon.
- **Dawn patrol (dawn-v1)** — the launch look, kept pixel-identical as a
  selectable legacy theme.
- **An Cairt** and **An Postaer** follow on the same token contract.

The picker ("Cuma") lives in the home nav; choice persists per device.
