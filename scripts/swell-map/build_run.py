"""Fetch one GFS-Wave run from NOAA NOMADS and write swell map data images.

Usage:
  python build_run.py --out OUT [--run YYYYMMDDHH] [--step 3] [--max-hour 384]
  python build_run.py --out OUT --print-latest

Writes:
  OUT/runs/<run>/fNNN.png      one data image per forecast hour
  OUT/runs/<run>/manifest.json
  OUT/latest.json              the same manifest; upload it last

Without --run, picks the newest run whose last forecast hour is published.
NOMADS blocks clients that send requests too fast, so requests are paced.
"""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
from PIL import Image

from swell_encode import Partition, encode_frame, manifest

NOMADS = "https://nomads.ncep.noaa.gov"
FILTER = f"{NOMADS}/cgi-bin/filter_gfswave.pl"
PROD = f"{NOMADS}/pub/data/nccf/com/gfs/prod"
GRID = "global.0p25"

# North-East Atlantic: Iceland to the Canaries, mid-Atlantic to the North Sea.
CROP = {"toplat": 66, "bottomlat": 30, "leftlon": -40, "rightlon": 5}
VARIABLES = ("HTSGW", "SWELL", "SWPER", "SWDIR", "WVHGT", "WVPER", "WVDIR")

PACE_S = 1.5
RETRIES = 4
USER_AGENT = "tonnta-swell-map/1.0"


def request(url: str, timeout: float = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def exists(url: str) -> bool:
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return response.status == 200
    except urllib.error.HTTPError:
        return False


def file_name(run: str, hour: int) -> str:
    return f"gfswave.t{run[8:10]}z.{GRID}.f{hour:03d}.grib2"


def run_dir(run: str) -> str:
    return f"gfs.{run[:8]}/{run[8:10]}/wave/gridded"


def latest_complete_run(max_hour: int, now: datetime) -> str:
    """Newest cycle in the last two days whose final forecast hour is published."""
    cycle = now.replace(minute=0, second=0, microsecond=0)
    cycle -= timedelta(hours=cycle.hour % 6)
    for _ in range(8):
        run = cycle.strftime("%Y%m%d%H")
        if exists(f"{PROD}/{run_dir(run)}/{file_name(run, max_hour)}.idx"):
            return run
        cycle -= timedelta(hours=6)
    raise SystemExit("no complete GFS-Wave run in the last two days")


def fetch_frame(run: str, hour: int, dest: Path) -> None:
    params = [
        ("dir", f"/{run_dir(run)}"),
        ("file", file_name(run, hour)),
        *[(f"var_{v}", "on") for v in VARIABLES],
        ("all_lev", "on"),
        ("subregion", ""),
        *[(k, str(v)) for k, v in CROP.items()],
    ]
    url = FILTER + "?" + "&".join(f"{k}={urllib.request.quote(v, safe='/')}" for k, v in params)
    for attempt in range(1, RETRIES + 1):
        try:
            body = request(url)
            if not body.startswith(b"GRIB"):
                raise ValueError(f"not a GRIB file ({len(body)} bytes)")
            dest.write_bytes(body)
            return
        except (urllib.error.URLError, TimeoutError, ValueError) as error:
            if attempt == RETRIES:
                raise RuntimeError(f"f{hour:03d}: {error}") from error
            time.sleep(PACE_S * 2**attempt)


def read_frame(path: Path):
    """Decode one cropped GRIB file into the fields the encoder needs."""
    import eccodes  # imported here so the encoder tests run without it

    by_name: dict[tuple[str, int], np.ndarray] = {}
    meta: dict[str, float | int | str] = {}
    with path.open("rb") as handle:
        while (gid := eccodes.codes_grib_new_from_file(handle)) is not None:
            try:
                ni = eccodes.codes_get(gid, "Ni")
                nj = eccodes.codes_get(gid, "Nj")
                values = eccodes.codes_get_values(gid).reshape(nj, ni)
                missing = eccodes.codes_get(gid, "missingValue")
                values = np.where(values == missing, np.nan, values)
                key = (eccodes.codes_get(gid, "shortName"), eccodes.codes_get(gid, "level"))
                by_name[key] = values
                if not meta:
                    meta = {
                        "ni": ni,
                        "nj": nj,
                        "lat_first": eccodes.codes_get(gid, "latitudeOfFirstGridPointInDegrees"),
                        "lat_last": eccodes.codes_get(gid, "latitudeOfLastGridPointInDegrees"),
                        "lon_first": eccodes.codes_get(gid, "longitudeOfFirstGridPointInDegrees"),
                        "lon_last": eccodes.codes_get(gid, "longitudeOfLastGridPointInDegrees"),
                        "step": eccodes.codes_get(gid, "iDirectionIncrementInDegrees"),
                        "valid_date": eccodes.codes_get(gid, "validityDate"),
                        "valid_time": eccodes.codes_get(gid, "validityTime"),
                    }
            finally:
                eccodes.codes_release(gid)

    def field(name: str, level: int = 1) -> np.ndarray:
        if (name, level) not in by_name:
            raise KeyError(f"{path.name} has no {name} level {level}")
        return by_name[(name, level)]

    partitions = {
        f"swell{n}": Partition(field("shts", n), field("mpts", n), field("swdir", n))
        for n in (1, 2, 3)
    }
    partitions["windsea"] = Partition(field("shww"), field("mpww"), field("wvdir"))
    return field("swh"), partitions, meta


def east(lon: float) -> float:
    return lon - 360 if lon > 180 else lon


def build(run: str, out: Path, step: int, max_hour: int) -> dict[str, object]:
    run_out = out / "runs" / run
    run_out.mkdir(parents=True, exist_ok=True)
    frames: list[dict[str, str]] = []
    grid: dict[str, float | int] = {}
    with tempfile.TemporaryDirectory() as tmp:
        for hour in range(0, max_hour + 1, step):
            grib = Path(tmp) / f"f{hour:03d}.grib2"
            fetch_frame(run, hour, grib)
            combined, partitions, meta = read_frame(grib)
            north_first = meta["lat_first"] > meta["lat_last"]
            image = encode_frame(combined, partitions, north_first=north_first)
            name = f"f{hour:03d}.png"
            Image.fromarray(image, "RGBA").save(run_out / name, optimize=True)
            valid = datetime.strptime(
                f"{meta['valid_date']}{int(meta['valid_time']):04d}", "%Y%m%d%H%M"
            ).replace(tzinfo=timezone.utc)
            frames.append({"validTime": valid.strftime("%Y-%m-%dT%H:%M:%SZ"), "file": name})
            if not grid:
                grid = {
                    "ni": int(meta["ni"]),
                    "nj": int(meta["nj"]),
                    "latNorth": float(max(meta["lat_first"], meta["lat_last"])),
                    "latSouth": float(min(meta["lat_first"], meta["lat_last"])),
                    "lonWest": round(east(float(meta["lon_first"])), 4),
                    "lonEast": round(east(float(meta["lon_last"])), 4),
                    "stepDeg": float(meta["step"]),
                }
            print(f"{name} valid {frames[-1]['validTime']}", file=sys.stderr)
            time.sleep(PACE_S)
    doc = manifest(run, grid, frames)
    text = json.dumps(doc, indent=2)
    (run_out / "manifest.json").write_text(text)
    (out / "latest.json").write_text(text)
    return doc


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--run", help="YYYYMMDDHH; default: newest complete run")
    parser.add_argument("--step", type=int, default=3)
    parser.add_argument("--max-hour", type=int, default=384)
    parser.add_argument(
        "--print-latest", action="store_true", help="print the newest complete run and stop"
    )
    args = parser.parse_args()
    run = args.run or latest_complete_run(args.max_hour, datetime.now(timezone.utc))
    if args.print_latest:
        print(run)
        return
    doc = build(run, args.out, args.step, args.max_hour)
    print(doc["run"])


if __name__ == "__main__":
    main()
