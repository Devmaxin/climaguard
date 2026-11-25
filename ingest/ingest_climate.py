"""ClimaGuard climate ingestion.

Downloads ECMWF IFS Open Data for the launch cities, normalises it, and
upserts it into Supabase. Runs from GitHub Actions on a schedule, authenticated
as service_role.

Design notes
------------
* The forecast cycle is *discovered* (`Client.latest`), never assumed. ECMWF
  publishes between 7 and 9 hours after initialisation and gives no
  exact-time guarantee, so the workflow is scheduled well past that window
  and this script picks whatever the newest published cycle actually is.
* Re-running the same cycle is cheap and harmless: the script checks the
  ingest log first and exits without downloading if that cycle already
  succeeded.
* Nothing is deleted until the whole cycle has been written. A failure part
  way through leaves the previous good forecast in place.
* Errors written to the log are sanitised: no keys, no auth headers, no
  credential-bearing URLs.
"""

from __future__ import annotations

import argparse
import math
import os
import re
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from typing import Any, Sequence

import numpy as np
import requests
import xarray as xr
from ecmwf.opendata import Client

from precipitation import detect_mode, interval_totals

# ---------------------------------------------------------------------------
# Scope
# ---------------------------------------------------------------------------

CITIES: dict[str, tuple[float, float]] = {
    "lagos": (6.45, 3.39),
    "metro_manila": (14.60, 120.98),
    "dhaka": (23.81, 90.41),
}

STEPS: list[int] = list(range(0, 73, 3))

SOURCE_LABEL = "ECMWF Open Data (IFS 0.25°)"
LICENCE = "CC BY 4.0"
RETENTION_RUNS = 2

# Sanity bounds. A value outside these means something went wrong upstream and
# the run should fail loudly instead of writing nonsense to the database.
PLAUSIBLE = {
    "temperature_2m": (-40.0, 60.0),
    "wind_speed": (0.0, 400.0),
    "wind_direction": (0.0, 360.0),
    "precipitation": (0.0, 1000.0),
    "pressure_msl": (800.0, 1100.0),
}


class IngestError(RuntimeError):
    """Raised for any condition that should abort the run."""


# ---------------------------------------------------------------------------
# Small pure helpers (unit tested indirectly through the pipeline)
# ---------------------------------------------------------------------------


def to_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def iso(value: datetime) -> str:
    # "Z" rather than "+00:00": these strings also travel inside PostgREST
    # query parameters, where a literal "+" would be decoded as a space.
    return to_utc(value).strftime("%Y-%m-%dT%H:%M:%SZ")


def wind_direction_deg(u: float, v: float) -> float:
    """Meteorological wind direction: the bearing the wind blows *from*."""
    return (270.0 - math.degrees(math.atan2(v, u))) % 360.0


def check_plausible(variable: str, value: float) -> float:
    low, high = PLAUSIBLE[variable]
    if not math.isfinite(value):
        raise IngestError(f"{variable}: non-finite value {value!r}")
    if not (low <= value <= high):
        raise IngestError(f"{variable}: {value} outside plausible range [{low}, {high}]")
    return value


def sanitize_error(exc: BaseException) -> str:
    """Strip anything credential-shaped before an error reaches the database."""
    text = f"{type(exc).__name__}: {exc}"
    text = re.sub(r"(?i)(authorization|apikey|api_key|token|key)=\S+", r"\1=[redacted]", text)
    text = re.sub(r"(?i)bearer\s+\S+", "Bearer [redacted]", text)
    text = re.sub(r"eyJ[A-Za-z0-9_\-\.]{10,}", "[jwt]", text)
    return text[:1000]


# ---------------------------------------------------------------------------
# ECMWF retrieval
# ---------------------------------------------------------------------------


def discover_latest_cycle(client: Client) -> datetime:
    """Ask ECMWF for the newest published cycle without downloading data.

    `Client.latest` is documented to return the date of the most recent
    matching forecast. The call signature has varied between client releases,
    so a couple of variants are attempted before giving up.
    """
    attempts: list[dict[str, Any]] = [
        {"type": "fc", "step": STEPS[-1], "param": ["2t"]},
        {"type": "fc", "step": STEPS[-1], "param": ["2t"], "target": "latest.grib2"},
    ]

    last_error: BaseException | None = None
    for kwargs in attempts:
        try:
            result = client.latest(**kwargs)
        except TypeError as exc:  # signature mismatch between client versions
            last_error = exc
            continue

        if isinstance(result, datetime):
            return to_utc(result)
        if isinstance(result, str):
            return to_utc(datetime.fromisoformat(result.replace("Z", "+00:00")))

        last_error = IngestError(f"Client.latest returned {type(result).__name__}: {result!r}")
        break

    raise IngestError(f"could not discover the latest ECMWF cycle: {last_error}")


def download(client: Client, param: str, cycle: datetime, target: str) -> str:
    client.retrieve(
        target=target,
        date=cycle.strftime("%Y%m%d"),
        time=cycle.hour,
        type="fc",
        step=STEPS,
        param=[param],
    )
    return target


def open_param(path: str, short_name: str) -> xr.DataArray:
    """Open the one parameter matching a GRIB shortName.

    cfgrib names the resulting variable after the GRIB `name`, not the
    `shortName` used to filter it ("2t" decodes to a variable called "t2m"),
    so the single data variable is taken by position instead.
    """
    dataset = xr.open_dataset(
        path,
        engine="cfgrib",
        backend_kwargs={"filter_by_keys": {"shortName": short_name}, "indexpath": ""},
    )
    names = list(dataset.data_vars)
    if len(names) != 1:
        raise IngestError(f"{short_name}: expected one data variable, found {names}")
    return dataset[names[0]]


def values_by_step(field: xr.DataArray, name: str) -> tuple[dict[int, Any], dict[str, Any]]:
    """Split a decoded parameter into per-step fields plus its GRIB metadata."""
    attrs = dict(field.attrs)

    if "step" in field.dims:
        per_step = {
            step: field.sel(step=np.timedelta64(step, "h"))
            for step in STEPS
            if np.timedelta64(step, "h") in field["step"].values
        }
    else:
        per_step = {0: field}

    if not per_step:
        raise IngestError(f"{name}: no forecast steps decoded")
    return per_step, attrs


def sample_point(field: Any, lat: float, lon: float, method: str) -> float:
    """Reduce a grid field to the value at one city coordinate."""
    longitudes = field["longitude"].values
    if longitudes.max() > 180 and lon < 0:
        lon = lon % 360

    if method == "nearest":
        picked = field.sel(latitude=lat, longitude=lon, method="nearest")
    else:
        picked = field.interp(latitude=lat, longitude=lon, method="linear")

    value = float(np.asarray(picked).ravel()[0])
    return value


# ---------------------------------------------------------------------------
# Supabase REST access
# ---------------------------------------------------------------------------


class Supabase:
    def __init__(self, url: str, key: str) -> None:
        if not url or not key:
            raise IngestError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set")
        self.base = url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    def already_ingested(self, reference: datetime) -> bool:
        response = requests.get(
            f"{self.base}/climate_ingest_log",
            headers=self.headers,
            params={
                "select": "id",
                "status": "eq.success",
                "forecast_reference_time": f"eq.{iso(reference)}",
                "limit": "1",
            },
            timeout=30,
        )
        response.raise_for_status()
        return bool(response.json())

    def previous_reference(self, current: datetime) -> datetime | None:
        response = requests.get(
            f"{self.base}/climate_forecasts",
            headers=self.headers,
            params={
                "select": "forecast_reference_time",
                "forecast_reference_time": f"lt.{iso(current)}",
                "order": "forecast_reference_time.desc",
                "limit": "1",
            },
            timeout=30,
        )
        response.raise_for_status()
        rows = response.json()
        if not rows:
            return None
        return datetime.fromisoformat(rows[0]["forecast_reference_time"].replace("Z", "+00:00"))

    def upsert_forecasts(self, rows: Sequence[dict[str, Any]]) -> int:
        written = 0
        for start in range(0, len(rows), 500):
            batch = list(rows[start : start + 500])
            response = requests.post(
                f"{self.base}/climate_forecasts",
                headers={**self.headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
                params={
                    "on_conflict": "city_key,variable,forecast_reference_time,valid_time"
                },
                json=batch,
                timeout=120,
            )
            if response.status_code >= 400:
                raise IngestError(
                    f"upsert failed ({response.status_code}): {sanitize_error(RuntimeError(response.text[:400]))}"
                )
            written += len(batch)
        return written

    def prune_older_than(self, keep: Sequence[datetime]) -> None:
        quoted = ",".join(f'"{iso(reference)}"' for reference in keep)
        response = requests.delete(
            f"{self.base}/climate_forecasts",
            headers=self.headers,
            params={
                "city_key": f"in.({','.join(CITIES)})",
                "forecast_reference_time": f"not.in.({quoted})",
            },
            timeout=60,
        )
        if response.status_code >= 400:
            raise IngestError(
                f"retention delete failed ({response.status_code}): {response.text[:200]}"
            )

    def log(self, **row: Any) -> None:
        requests.post(
            f"{self.base}/climate_ingest_log",
            headers={**self.headers, "Prefer": "return=minimal"},
            json=row,
            timeout=30,
        )


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------


def build_rows(cycle: datetime, dataset_dir: str, client: Client) -> list[dict[str, Any]]:
    """Download, decode, interpolate and normalise one forecast cycle."""
    fields: dict[str, tuple[dict[int, Any], dict[str, Any]]] = {}

    for param in ("2t", "10u", "10v", "msl", "tp"):
        path = os.path.join(dataset_dir, f"{param}.grib2")
        download(client, param, cycle, path)
        field = open_param(path, param)
        fields[param] = values_by_step(field, param)

    rows: list[dict[str, Any]] = []

    def add(city: str, variable: str, unit: str, step: int, value: float, method: str) -> None:
        rows.append(
            {
                "city_key": city,
                "variable": variable,
                "value": check_plausible(variable, value),
                "unit": unit,
                "valid_time": iso(cycle + timedelta(hours=step)),
                "forecast_reference_time": iso(cycle),
                "forecast_step": step,
                "source": SOURCE_LABEL,
                "source_licence": LICENCE,
                "interpolation": method,
                "fetched_at": iso(datetime.now(tz=timezone.utc)),
            }
        )

    for city, (lat, lon) in CITIES.items():
        for step, field in sorted(fields["2t"][0].items()):
            kelvin = sample_point(field, lat, lon, "bilinear")
            add(city, "temperature_2m", "degC", step, kelvin - 273.15, "bilinear")

        for step, field in sorted(fields["msl"][0].items()):
            pascals = sample_point(field, lat, lon, "bilinear")
            add(city, "pressure_msl", "hPa", step, pascals / 100.0, "bilinear")

        u_fields = fields["10u"][0]
        v_fields = fields["10v"][0]
        for step in sorted(set(u_fields) & set(v_fields)):
            u = sample_point(u_fields[step], lat, lon, "bilinear")
            v = sample_point(v_fields[step], lat, lon, "bilinear")
            add(city, "wind_speed", "kmh", step, math.hypot(u, v) * 3.6, "bilinear")
            add(city, "wind_direction", "deg", step, wind_direction_deg(u, v), "bilinear")

        tp_fields, tp_attrs = fields["tp"]
        steps = sorted(tp_fields)
        raw = [sample_point(tp_fields[step], lat, lon, "nearest") for step in steps]
        mode = detect_mode(tp_attrs)
        for step, metres in interval_totals(raw, steps, mode):
            add(city, "precipitation", "mm", step, metres * 1000.0, "nearest")

    return rows


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest ECMWF forecasts into Supabase")
    parser.add_argument(
        "--force",
        action="store_true",
        help="re-ingest even if this cycle already succeeded",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="download and normalise without writing to Supabase",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)

    url = os.environ.get("SUPABASE_URL", "").strip()
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    started_at = iso(datetime.now(tz=timezone.utc))
    db: Supabase | None = None
    cycle: datetime | None = None

    try:
        if not args.dry_run:
            db = Supabase(url, key)

        client = Client(source="aws", model="ifs", resol="0p25")
        cycle = discover_latest_cycle(client)
        print(f"latest published cycle: {iso(cycle)}", flush=True)

        if db is not None and not args.force and db.already_ingested(cycle):
            print(f"cycle {iso(cycle)} already ingested — nothing to do", flush=True)
            db.log(
                started_at=started_at,
                finished_at=iso(datetime.now(tz=timezone.utc)),
                status="skipped",
                forecast_reference_time=iso(cycle),
                rows_written=0,
            )
            return 0

        with tempfile.TemporaryDirectory() as workdir:
            rows = build_rows(cycle, workdir, client)

        print(f"normalised {len(rows)} rows", flush=True)

        if db is None:
            return 0

        written = db.upsert_forecasts(rows)

        keep = [cycle]
        previous = db.previous_reference(cycle)
        if previous is not None:
            keep.append(previous)
        db.prune_older_than(keep[:RETENTION_RUNS])

        db.log(
            started_at=started_at,
            finished_at=iso(datetime.now(tz=timezone.utc)),
            status="success",
            forecast_reference_time=iso(cycle),
            rows_written=written,
        )
        print(f"wrote {written} rows for cycle {iso(cycle)}", flush=True)
        return 0

    except Exception as exc:  # noqa: BLE001 - top-level guard, logged sanitised
        message = sanitize_error(exc)
        print(f"ingest failed: {message}", file=sys.stderr, flush=True)
        if db is not None:
            try:
                db.log(
                    started_at=started_at,
                    finished_at=iso(datetime.now(tz=timezone.utc)),
                    status="failed",
                    forecast_reference_time=iso(cycle) if cycle else None,
                    rows_written=0,
                    error=message,
                )
            except Exception:  # noqa: BLE001 - logging must not mask the original error
                print("could not write ingest log", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
