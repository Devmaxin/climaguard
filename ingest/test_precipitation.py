"""Unit tests for precipitation accumulation handling.

Run with: python -m unittest discover -s ingest -p 'test_*.py' -v
No network access and no third-party packages required.
"""

import unittest

from precipitation import (
    CUMULATIVE,
    INTERVAL,
    detect_mode,
    interval_totals,
)


class DetectModeTests(unittest.TestCase):
    def test_zero_start_step_is_cumulative(self):
        attrs = {
            "GRIB_stepType": "accum",
            "GRIB_startStep": 0,
            "GRIB_endStep": 12,
            "GRIB_stepRange": "0-12",
        }
        self.assertEqual(detect_mode(attrs), CUMULATIVE)

    def test_non_zero_start_step_is_interval(self):
        attrs = {
            "GRIB_stepType": "accum",
            "GRIB_startStep": 9,
            "GRIB_endStep": 12,
            "GRIB_stepRange": "9-12",
        }
        self.assertEqual(detect_mode(attrs), INTERVAL)

    def test_falls_back_to_step_range(self):
        attrs = {"GRIB_stepType": "accum", "GRIB_stepRange": "0-6"}
        self.assertEqual(detect_mode(attrs), CUMULATIVE)

    def test_instantaneous_field_is_not_accumulated(self):
        self.assertEqual(detect_mode({"GRIB_stepType": "instant"}), INTERVAL)

    def test_undeterminable_metadata_raises(self):
        with self.assertRaises(ValueError):
            detect_mode({"GRIB_stepType": "accum"})


class CumulativeTests(unittest.TestCase):
    def test_differences_successive_steps(self):
        steps = [0, 3, 6, 9]
        values = [0.0, 1.0, 3.0, 6.0]
        self.assertEqual(
            interval_totals(values, steps, CUMULATIVE),
            [(3, 1.0), (6, 2.0), (9, 3.0)],
        )

    def test_step_zero_is_dropped(self):
        totals = interval_totals([0.0, 0.5], [0, 3], CUMULATIVE)
        self.assertEqual([step for step, _ in totals], [3])

    def test_dry_forecast_yields_zeroes(self):
        totals = interval_totals([0.0, 0.0, 0.0], [0, 3, 6], CUMULATIVE)
        self.assertEqual(totals, [(3, 0.0), (6, 0.0)])

    def test_decreasing_series_raises(self):
        with self.assertRaises(ValueError):
            interval_totals([0.0, 5.0, 2.0], [0, 3, 6], CUMULATIVE)

    def test_float_noise_is_clamped_to_zero(self):
        totals = interval_totals([0.0, 1e-9, 1e-9 - 1e-12], [0, 3, 6], CUMULATIVE)
        self.assertEqual(totals[1], (6, 0.0))

    def test_unsorted_input_is_ordered_by_step(self):
        totals = interval_totals([6.0, 0.0, 3.0], [9, 0, 6], CUMULATIVE)
        self.assertEqual(totals, [(6, 3.0), (9, 3.0)])


class IntervalTests(unittest.TestCase):
    def test_values_pass_through_unchanged(self):
        totals = interval_totals([9.9, 0.4, 1.2], [0, 3, 6], INTERVAL)
        self.assertEqual(totals, [(3, 0.4), (6, 1.2)])

    def test_no_differencing_applied(self):
        totals = interval_totals([0.0, 2.0, 2.0], [0, 3, 6], INTERVAL)
        self.assertEqual(totals, [(3, 2.0), (6, 2.0)])


class ShapeTests(unittest.TestCase):
    def test_length_mismatch_raises(self):
        with self.assertRaises(ValueError):
            interval_totals([0.0, 1.0], [0, 3, 6], CUMULATIVE)

    def test_single_step_has_no_intervals(self):
        self.assertEqual(interval_totals([0.0], [0], CUMULATIVE), [])


if __name__ == "__main__":
    unittest.main()
