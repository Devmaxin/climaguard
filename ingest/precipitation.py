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

# Floating point noise from GRIB packing can make a strictly non-decreasing
# series dip microscopically. Anything smaller than this is treated as zero.
NEGATIVE_TOLERANCE_MM = 1e-6


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
                f"from step {prev_step} ({prev_value}) to step {step} ({value}); "
                "the accumulation mode was probably misdetected"
            )
        totals.append((int(step), max(delta, 0.0)))
    return totals
