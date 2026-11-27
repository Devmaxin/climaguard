"""Unit tests for the completeness guard applied before any write.

Run with: python -m unittest discover -p 'test_*.py' -v
No network access is required.
"""

import sys
import types
import unittest

# The ingestion module imports optional runtime dependencies that are not
# needed to exercise the guard. Stub them only when absent so these tests also
# run without a full ingestion environment.
for module_name in ("eccodes", "numpy", "xarray"):
    try:
        __import__(module_name)
    except ImportError:
        sys.modules[module_name] = types.ModuleType(module_name)

try:
    import ecmwf.opendata  # noqa: F401
except ImportError:
    ecmwf = sys.modules.setdefault("ecmwf", types.ModuleType("ecmwf"))
    ecmwf.__path__ = []
    opendata = types.ModuleType("ecmwf.opendata")
    opendata.Client = object
    sys.modules["ecmwf"] = ecmwf
    sys.modules["ecmwf.opendata"] = opendata

import ingest_climate

# Precipitation is accumulated over the preceding interval, so it starts at the
# first accumulation step and covers one fewer step than the instantaneous
# variables. Matches the shape observed in production (124 rows per city).
ACCUMULATED_VARIABLE = "precipitation"


def steps_for(variable):
    if variable == ACCUMULATED_VARIABLE:
        return list(ingest_climate.STEPS[1:])
    return list(ingest_climate.STEPS)


def make_rows():
    rows = []
    for city in ingest_climate.CITIES:
        for variable in sorted(ingest_climate.EXPECTED_VARIABLES):
            for step in steps_for(variable):
                rows.append(
                    {"city_key": city, "variable": variable, "forecast_step": step}
                )
    return rows


class CompletenessTests(unittest.TestCase):
    def test_complete_cycle_is_accepted(self):
        rows = make_rows()
        self.assertEqual(len(rows), 3 * 124)
        ingest_climate.check_complete(rows)

    def test_single_missing_row_is_rejected(self):
        rows = make_rows()
        removed = rows.pop(10)

        with self.assertRaises(ingest_climate.IngestError) as caught:
            ingest_climate.check_complete(rows)

        self.assertIn("1 rows missing", str(caught.exception))
        self.assertIn(removed["city_key"], str(caught.exception))

    def test_missing_variable_is_rejected(self):
        rows = [row for row in make_rows() if row["variable"] != "wind_speed"]

        with self.assertRaises(ingest_climate.IngestError) as caught:
            ingest_climate.check_complete(rows)

        self.assertIn("no data for wind_speed", str(caught.exception))

    def test_missing_city_is_rejected(self):
        city = sorted(ingest_climate.CITIES)[0]
        rows = [row for row in make_rows() if row["city_key"] != city]

        with self.assertRaises(ingest_climate.IngestError) as caught:
            ingest_climate.check_complete(rows)

        self.assertIn(city, str(caught.exception))
        self.assertIn("rows missing", str(caught.exception))

    def test_truncated_window_is_rejected(self):
        # Every city loses the last steps of one variable, which a per-city
        # check alone would miss because the step set is read from the rows.
        rows = [row for row in make_rows() if row["forecast_step"] != ingest_climate.STEPS[-1]]

        with self.assertRaises(ingest_climate.IngestError) as caught:
            ingest_climate.check_complete(rows)

        self.assertIn("truncated forecast window", str(caught.exception))

    def test_short_precipitation_is_rejected(self):
        rows = [
            row
            for row in make_rows()
            if not (
                row["variable"] == ACCUMULATED_VARIABLE
                and row["forecast_step"] in steps_for(ACCUMULATED_VARIABLE)[-2:]
            )
        ]

        with self.assertRaises(ingest_climate.IngestError) as caught:
            ingest_climate.check_complete(rows)

        self.assertIn("precipitation covers only", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
