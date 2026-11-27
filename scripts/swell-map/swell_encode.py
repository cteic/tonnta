"""Turn GFS-Wave fields into a swell map data image.

Pure numpy, no GRIB or network code, so the encoding can be tested on its own.
The byte layout here is the contract `packages/swell-map/src/decode.ts` reads.

One frame image stacks four tiles top to bottom: swell 1, 2, 3, wind sea.
Each tile is the cropped grid with the north row first. Per pixel:

  R  height, HEIGHT_STEP_M metres per step
  G  period, PERIOD_STEP_S seconds per step
  B  direction the swell comes from, DIRECTION_STEP_DEG degrees per step
  A  255 this swell is present, 128 sea without this swell, 0 land

Byte 255 in R, G and B is never written.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

HEIGHT_STEP_M = 0.05
PERIOD_STEP_S = 0.1
DIRECTION_STEP_DEG = 360.0 / 254.0

ALPHA_PRESENT = 255
ALPHA_ABSENT = 128
ALPHA_LAND = 0

TILES = ("swell1", "swell2", "swell3", "windsea")


@dataclass(frozen=True)
class Partition:
    """Height, period and direction for one swell, NaN where the model has none."""

    height_m: np.ndarray
    period_s: np.ndarray
    from_deg: np.ndarray


def quantise(values: np.ndarray, step: float) -> np.ndarray:
    steps = np.round(np.nan_to_num(values, nan=0.0) / step)
    return np.clip(steps, 0, 254).astype(np.uint8)


def encode_tile(partition: Partition, sea: np.ndarray) -> np.ndarray:
    """One tile as RGBA. `sea` is the land mask: True where the sea has any waves."""
    present = sea & ~np.isnan(partition.height_m)
    rgba = np.zeros(partition.height_m.shape + (4,), dtype=np.uint8)
    rgba[..., 0] = np.where(present, quantise(partition.height_m, HEIGHT_STEP_M), 0)
    rgba[..., 1] = np.where(present, quantise(partition.period_s, PERIOD_STEP_S), 0)
    direction = np.mod(np.nan_to_num(partition.from_deg, nan=0.0), 360.0)
    rgba[..., 2] = np.where(present, quantise(direction, DIRECTION_STEP_DEG), 0)
    rgba[..., 3] = np.where(present, ALPHA_PRESENT, np.where(sea, ALPHA_ABSENT, ALPHA_LAND))
    return rgba


def encode_frame(
    combined_height_m: np.ndarray,
    partitions: dict[str, Partition],
    north_first: bool,
) -> np.ndarray:
    """Stack the four tiles into one RGBA image.

    A missing swell value means that swell does not exist there, not that the
    cell is land. Only the combined wave height (HTSGW) has a value at every
    sea cell, so it alone decides the land mask.
    """
    missing = [name for name in TILES if name not in partitions]
    if missing:
        raise ValueError(f"missing partitions: {', '.join(missing)}")
    sea = ~np.isnan(combined_height_m)
    tiles = [encode_tile(partitions[name], sea) for name in TILES]
    if not north_first:
        tiles = [tile[::-1] for tile in tiles]
    return np.concatenate(tiles, axis=0)


def manifest(
    run: str,
    grid: dict[str, float | int],
    frames: list[dict[str, str]],
) -> dict[str, object]:
    """The JSON a client reads; matches `SwellMapManifest` in packages/swell-map."""
    return {
        "version": 1,
        "run": run,
        "source": "NOAA GFS-Wave global.0p25",
        "grid": grid,
        "scale": {
            "heightM": HEIGHT_STEP_M,
            "periodS": PERIOD_STEP_S,
            "directionDeg": DIRECTION_STEP_DEG,
        },
        "tiles": list(TILES),
        "frames": frames,
    }
