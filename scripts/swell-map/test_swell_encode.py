import numpy as np
import pytest

from swell_encode import (
    ALPHA_ABSENT,
    ALPHA_LAND,
    ALPHA_PRESENT,
    DIRECTION_STEP_DEG,
    HEIGHT_STEP_M,
    PERIOD_STEP_S,
    TILES,
    Partition,
    encode_frame,
    manifest,
)

NAN = np.nan


def partition(h, p, d):
    return Partition(np.array(h, dtype=float), np.array(p, dtype=float), np.array(d, dtype=float))


def calm_partitions(shape):
    blank = np.full(shape, NAN)
    return {name: Partition(blank, blank, blank) for name in TILES}


def test_land_comes_from_combined_height_not_from_a_missing_swell():
    # Regression: the first prototype used a missing swell value as land, which
    # turned the North Sea (no swell 1 there) into land on the map.
    combined = np.array([[1.5, 0.8, NAN]])
    parts = calm_partitions((1, 3))
    parts["swell1"] = partition([[1.2, NAN, NAN]], [[11.0, NAN, NAN]], [[270.0, NAN, NAN]])

    frame = encode_frame(combined, parts, north_first=True)

    swell1_alpha = frame[0, :, 3]
    assert list(swell1_alpha) == [ALPHA_PRESENT, ALPHA_ABSENT, ALPHA_LAND]


def test_values_round_trip_within_half_a_step():
    h, p, d = 7.72, 20.92, 359.89
    combined = np.array([[h]])
    parts = calm_partitions((1, 1))
    parts["swell2"] = partition([[h]], [[p]], [[d]])

    frame = encode_frame(combined, parts, north_first=True)
    r, g, b, a = frame[1, 0]

    assert a == ALPHA_PRESENT
    assert abs(r * HEIGHT_STEP_M - h) <= HEIGHT_STEP_M / 2
    assert abs(g * PERIOD_STEP_S - p) <= PERIOD_STEP_S / 2
    decoded = (b * DIRECTION_STEP_DEG) % 360
    assert min(abs(decoded - d), 360 - abs(decoded - d)) <= DIRECTION_STEP_DEG / 2 + 1e-9


def test_values_past_the_range_clip_to_254_never_255():
    combined = np.array([[20.0]])
    parts = calm_partitions((1, 1))
    parts["swell1"] = partition([[20.0]], [[40.0]], [[720.0]])

    r, g, b, _ = encode_frame(combined, parts, north_first=True)[0, 0]

    assert (r, g) == (254, 254)
    assert b < 255


def test_tiles_stack_in_contract_order_with_north_first():
    # Two rows, south row first as GFS-Wave stores them.
    combined = np.array([[1.0], [1.0]])
    parts = calm_partitions((2, 1))
    parts["windsea"] = partition([[0.5], [2.0]], [[4.0], [6.0]], [[90.0], [90.0]])

    frame = encode_frame(combined, parts, north_first=False)

    assert frame.shape == (8, 1, 4)
    windsea = frame[6:8, 0]
    assert windsea[0, 0] == round(2.0 / HEIGHT_STEP_M)  # north row first
    assert windsea[1, 0] == round(0.5 / HEIGHT_STEP_M)


def test_a_missing_partition_fails_loudly():
    parts = calm_partitions((1, 1))
    del parts["swell3"]
    with pytest.raises(ValueError, match="swell3"):
        encode_frame(np.array([[1.0]]), parts, north_first=True)


def test_manifest_names_the_scale_the_client_decodes_with():
    m = manifest("2026112706", {"ni": 1}, [{"validTime": "2026-11-27T06:00:00Z", "file": "f000.png"}])
    assert m["version"] == 1
    assert m["tiles"] == ["swell1", "swell2", "swell3", "windsea"]
    assert m["scale"] == {
        "heightM": HEIGHT_STEP_M,
        "periodS": PERIOD_STEP_S,
        "directionDeg": DIRECTION_STEP_DEG,
    }
