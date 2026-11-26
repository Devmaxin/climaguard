"""Unit tests for precipitation accumulation handling.

Run with: python -m unittest discover -s ingest -p 'test_*.py' -v
No network access and no third-party packages required.
"""

import unittest

from precipitation import (
    CUMULATIVE,
    INTERVAL,
    NEGATIVE_TOLERANCE_MM,
    detect_mode,
    interval_totals,
    to_millimetres,
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

    def test_step_type_is_case_insensitive(self):
        attrs = {"GRIB_stepType": "ACCUM", "GRIB_startStep": 0}
        self.assertEqual(detect_mode(attrs), CUMULATIVE)

    def test_string_valued_start_step(self):
        self.assertEqual(
            detect_mode({"GRIB_stepType": "accum", "GRIB_startStep": "0"}), CUMULATIVE
        )
        self.assertEqual(
            detect_mode({"GRIB_stepType": "accum", "GRIB_startStep": "9"}), INTERVAL
        )

    def test_unparseable_start_step_falls_back_to_step_range(self):
        attrs = {"GRIB_stepType": "accum", "GRIB_startStep": "abc", "GRIB_stepRange": "3-6"}
        self.assertEqual(detect_mode(attrs), INTERVAL)

    def test_step_range_without_a_dash_raises(self):
        with self.assertRaises(ValueError):
            detect_mode({"GRIB_stepType": "accum", "GRIB_stepRange": "6"})

    def test_missing_step_type_is_treated_as_instantaneous(self):
        # Documented behaviour: with no stepType there is nothing to accumulate.
        self.assertEqual(detect_mode({"GRIB_startStep": 0}), INTERVAL)


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


class ToMillimetresTests(unittest.TestCase):
    def test_converts_metres_to_millimetres(self):
        self.assertEqual(to_millimetres([0.0, 0.001, 0.00225830078125]), [0.0, 1.0, 2.25830078125])

    def test_empty_series(self):
        self.assertEqual(to_millimetres([]), [])


class PackingNoiseTests(unittest.TestCase):
    """GRIB packing must not be mistaken for a misdetected accumulation mode."""

    # Values from the failing run (45721277322, 2026-11-25), decoded `tp` in
    # metres. Both are exact multiples of 2**-16 m: 148 and 144 quanta.
    FAILING_STEP_6 = 0.00225830078125
    FAILING_STEP_9 = 0.002197265625

    def test_exact_failing_values_are_accepted(self):
        millimetres = to_millimetres([self.FAILING_STEP_6, self.FAILING_STEP_9])

        # The dip is 4 packing quanta (0.061 mm): noise, not missing rain.
        self.assertAlmostEqual(millimetres[1] - millimetres[0], -0.06103515625, places=12)
        self.assertEqual(interval_totals(millimetres, [6, 9], CUMULATIVE), [(9, 0.0)])

    def test_small_precision_decrease_is_clamped_to_zero(self):
        totals = interval_totals([2.50, 2.45], [6, 9], CUMULATIVE)
        self.assertEqual(totals, [(9, 0.0)])

    def test_decrease_just_inside_the_tolerance_is_clamped(self):
        totals = interval_totals([2.50, 2.4001], [6, 9], CUMULATIVE)
        self.assertEqual(totals, [(9, 0.0)])
        self.assertLess(0.0999, NEGATIVE_TOLERANCE_MM)

    def test_decrease_just_beyond_the_tolerance_raises(self):
        with self.assertRaises(ValueError):
            interval_totals([2.50, 2.3999], [6, 9], CUMULATIVE)

    def test_meaningful_decrease_raises(self):
        for drop in (0.5, 5.0, 12.0):
            with self.subTest(drop=drop):
                with self.assertRaises(ValueError):
                    interval_totals([20.0, 20.0 - drop], [6, 9], CUMULATIVE)

    def test_error_names_the_steps_and_the_drop(self):
        with self.assertRaises(ValueError) as context:
            interval_totals([20.0, 14.0], [6, 9], CUMULATIVE)

        message = str(context.exception)
        self.assertIn("from step 6", message)
        self.assertIn("to step 9", message)
        self.assertIn("mm", message)


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
