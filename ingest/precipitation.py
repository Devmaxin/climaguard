"""Precipitation accumulation handling, with no third-party dependencies.

ECMWF's IFS `tp` (total precipitation) can be encoded either as a running
total since the start of the forecast (`stepType=accum`, `startStep=0`) or as
a total for the preceding step interval only (`startStep>0`). The two need
different handling, so the mode is detected from each GRIB message at runtime
rather than assumed, and the arithmetic lives here where it can be unit tested
without downloading anything.
"""

from __future__ import annotations

from typing import Any, Mapping, Sequence

CUMULATIVE = "cumulative"
INTERVAL = "interval"

# A cumulative total must not decrease. Two messages are packed independently,
# each with its own binary scale factor and reference value, so a grid point
# can step back by a few quanta between them even in a monotonically wetting
# series. In the failing message the values were exact multiples of 2**-16 m
# (148 and 144 quanta), i.e. a quantum of 0.0153 mm and a dip of 4 quanta
# (0.061 mm).
#
# 0.1 mm is therefore a small multiple of the encoding resolution (about 6.5
# quanta at that scale factor) and still below the 0.1 mm at which this product
# reports rainfall, so nothing a reader could act on is hidden. A larger
# decrease is not packing noise and keeps raising.
NEGATIVE_TOLERANCE_MM = 0.1


def to_millimetres(values: Sequence[float]) -> list[float]:
    """Convert ECMWF `tp` totals from metres (cfgrib's unit) to millimetres.

    Everything below this boundary is millimetres, including the tolerance in
    `interval_totals`. Comparing a millimetre tolerance against metre-decoded
    values is what made the 2026-11-25 run fail: 1e-6 was read as 1e-6 m,
    i.e. 0.001 mm, a fifteenth of one packing quantum.
    """
    return [float(value) * 1000.0 for value in values]


def detect_mode(attrs: Mapping[str, Any]) -> str:
    """Classify a precipitation field from its GRIB metadata.

    Reads the keys ecCodes exposes through cfgrib:
    `GRIB_stepType`, `GRIB_startStep`, `GRIB_endStep`, `GRIB_stepRange`.

    Returns CUMULATIVE when the message is an accumulation anchored at the
    forecast start, INTERVAL otherwise.
    """
    step_type = str(attrs.get("GRIB_stepType", "")).strip().lower()
    if step_type not in ("accum", "avg", "max", "min", "diff"):
        # Instantaneous field: there is nothing to accumulate.
        return INTERVAL

    start_step = attrs.get("GRIB_startStep")
    if start_step is not None:
        try:
            return CUMULATIVE if int(start_step) == 0 else INTERVAL
        except (TypeError, ValueError):
            pass

    # Fall back to stepRange, e.g. "0-3" (cumulative) or "3-6" (interval).
    step_range = attrs.get("GRIB_stepRange")
    if isinstance(step_range, str) and "-" in step_range:
        head = step_range.split("-", 1)[0].strip()
        try:
            return CUMULATIVE if int(head) == 0 else INTERVAL
        except ValueError:
            pass

    raise ValueError(
        "Cannot determine precipitation accumulation mode from GRIB metadata: "
        f"stepType={step_type!r} startStep={start_step!r} stepRange={step_range!r}"
    )


def interval_totals(
    values: Sequence[float], steps: Sequence[int], mode: str
) -> list[tuple[int, float]]:
    """Turn a precipitation series into (step, mm) pairs for each interval.

    `values` must already be in millimetres; pass decoded `tp` through
    `to_millimetres()` first.

    The returned step is the *end* of the interval: the value reported at
    step 6 covers the hours from step 3 to step 6. Step 0 has no interval
    behind it and is dropped.

    Raises ValueError if a cumulative series decreases, which would mean the
    mode was misdetected and differencing would produce negative rainfall.
    """
    if len(values) != len(steps):
        raise ValueError(
            f"values and steps differ in length: {len(values)} != {len(steps)}"
        )
    if len(steps) < 2:
        return []

    ordered = sorted(zip(steps, values), key=lambda pair: pair[0])

    if mode == INTERVAL:
        return [(int(step), float(value)) for step, value in ordered if int(step) != 0]

    totals: list[tuple[int, float]] = []
    for index in range(1, len(ordered)):
        prev_step, prev_value = ordered[index - 1]
        step, value = ordered[index]
        delta = float(value) - float(prev_value)
        if delta < -NEGATIVE_TOLERANCE_MM:
            raise ValueError(
                "cumulative precipitation decreased "
                f"from step {prev_step} ({prev_value} mm) to step {step} ({value} mm), "
                f"a drop of {abs(delta):.4f} mm beyond the {NEGATIVE_TOLERANCE_MM} mm "
                "packing tolerance; the accumulation mode was probably misdetected"
            )
        totals.append((int(step), max(delta, 0.0)))
    return totals
