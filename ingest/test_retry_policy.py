"""Unit tests for the bounded ECMWF retry policy.

Run with: python -m unittest discover -s ingest -p 'test_*.py' -v
No network access is required.
"""

import io
import os
import sys
import types
import unittest
from unittest.mock import patch

import requests
from multiurl.retry import robust

# The ingestion module imports optional runtime dependencies that are not
# needed to verify its retry configuration. Stub them only when absent so
# these tests also run without a full ingestion environment.
def stub_if_missing(module_name):
    try:
        __import__(module_name)
    except ImportError:
        sys.modules[module_name] = types.ModuleType(module_name)


for module_name in ("eccodes", "numpy", "xarray"):
    stub_if_missing(module_name)

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


class FakeResponse:
    def __init__(self, status_code=503, headers=None):
        self.status_code = status_code
        self.reason = "Service Unavailable" if status_code >= 500 else "OK"
        self.headers = headers or {}

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"{self.status_code} {self.reason}")


class MakeClientTests(unittest.TestCase):
    def test_constructs_client_with_bounded_retries(self):
        with patch.object(ingest_climate, "Client") as client_class:
            ingest_climate.make_client()

        client_class.assert_called_once_with(
            source="ecmwf",
            model="ifs",
            resol="0p25",
            maximum_retries=6,
            retry_after=(5.0, 30.0, 2.0),
            use_server_retry_after=False,
        )
        self.assertEqual(ingest_climate.RETRY_TRIES, 6)
        self.assertEqual(ingest_climate.RETRY_BACKOFF, (5.0, 30.0, 2.0))


class BackoffTests(unittest.TestCase):
    def run_policy(self, responses, use_server_retry_after=False):
        calls = []
        queue = iter(responses)

        def call(url):
            calls.append(url)
            return next(queue)

        with patch("multiurl.retry._logged_sleep") as logged_sleep:
            result = robust(
                call,
                ingest_climate.RETRY_TRIES,
                ingest_climate.RETRY_BACKOFF,
                use_server_retry_after=use_server_retry_after,
            )("https://example.invalid/data")

        sleeps = [sleep.args[0] for sleep in logged_sleep.call_args_list]
        return result, calls, sleeps

    def test_transient_503_uses_exponential_backoff(self):
        result, calls, sleeps = self.run_policy(
            [FakeResponse(503), FakeResponse(503), FakeResponse(200)]
        )

        self.assertEqual(result.status_code, 200)
        self.assertEqual(len(calls), 3)
        self.assertEqual(sleeps, [5.0, 10.0])

    def test_persistent_503_stops_after_six_tries(self):
        result, calls, sleeps = self.run_policy([FakeResponse(503) for _ in range(6)])

        self.assertEqual(len(calls), 6)
        self.assertEqual(sleeps, [5.0, 10.0, 20.0, 30.0, 30.0])
        with self.assertRaises(requests.HTTPError):
            result.raise_for_status()

    def test_server_retry_after_is_ignored(self):
        _, calls, sleeps = self.run_policy(
            [FakeResponse(503, {"Retry-After": "120"}), FakeResponse(200)],
            use_server_retry_after=False,
        )

        self.assertEqual(len(calls), 2)
        self.assertEqual(sleeps, [5.0])


class RestRetryTests(unittest.TestCase):
    """The Supabase calls are retried on transient failures only."""

    def run_request(self, effects):
        calls = []
        queue = iter(effects)

        def fake_request(method, url, **kwargs):
            calls.append(method)
            item = next(queue)
            if isinstance(item, Exception):
                raise item
            return item

        with (
            patch.object(ingest_climate.requests, "request", side_effect=fake_request),
            patch.object(ingest_climate.time, "sleep") as sleep,
        ):
            try:
                response = ingest_climate.request_with_retry(
                    "GET", "https://example.invalid/rest"
                )
            except Exception as exc:  # noqa: BLE001 - surfaced to the test
                return exc, calls, [call.args[0] for call in sleep.call_args_list]
        return response, calls, [call.args[0] for call in sleep.call_args_list]

    def test_transient_503_is_retried(self):
        result, calls, sleeps = self.run_request(
            [FakeResponse(503), FakeResponse(200)]
        )

        self.assertEqual(result.status_code, 200)
        self.assertEqual(len(calls), 2)
        self.assertEqual(sleeps, [2.0])

    def test_connection_error_is_retried(self):
        result, calls, sleeps = self.run_request(
            [requests.ConnectionError("connection reset"), FakeResponse(200)]
        )

        self.assertEqual(result.status_code, 200)
        self.assertEqual(len(calls), 2)
        self.assertEqual(sleeps, [2.0])

    def test_client_error_is_not_retried(self):
        result, calls, sleeps = self.run_request([FakeResponse(400)])

        self.assertEqual(result.status_code, 400)
        self.assertEqual(len(calls), 1)
        self.assertEqual(sleeps, [])

    def test_exhausted_attempts_raise(self):
        result, calls, sleeps = self.run_request(
            [FakeResponse(503), FakeResponse(503), FakeResponse(503)]
        )

        self.assertIsInstance(result, ingest_climate.IngestError)
        self.assertIn("after 3 attempts", str(result))
        self.assertEqual(len(calls), 3)
        self.assertEqual(sleeps, [2.0, 4.0])


class MainFailureTests(unittest.TestCase):
    def test_http_503_does_not_write_forecasts(self):
        env = {
            "SUPABASE_URL": "https://example.invalid",
            "SUPABASE_SERVICE_ROLE_KEY": "not-a-real-key",
        }
        with (
            patch.dict(os.environ, env),
            patch.object(ingest_climate, "Supabase") as supabase_class,
            patch.object(ingest_climate, "make_client") as make_client,
            patch.object(sys, "stderr", new_callable=io.StringIO),
        ):
            make_client.return_value.latest.side_effect = requests.HTTPError(
                "503 Service Unavailable token=supersecret"
            )
            result = ingest_climate.main([])

        self.assertEqual(result, 1)
        db = supabase_class.return_value
        db.upsert_forecasts.assert_not_called()
        db.prune_older_than.assert_not_called()
        db.log.assert_called_once()
        logged = db.log.call_args.kwargs
        self.assertEqual(logged["status"], "failed")
        self.assertEqual(logged["rows_written"], 0)
        self.assertNotIn("supersecret", logged["error"])
        self.assertIn("token=[redacted]", logged["error"])


if __name__ == "__main__":
    unittest.main()
