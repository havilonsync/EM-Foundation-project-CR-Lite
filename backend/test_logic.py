import hashlib
import json
import unittest

from logic import (
    build_failure_reason,
    calculate_aggregate,
    calculate_chain_hash,
    check_partial_availability,
    evaluate_thresholds,
)


def _uniform_dimensions(value: float) -> dict:
    return {
        "source_quality": value,
        "retrieval_coverage": value,
        "internal_consistency": value,
        "temporal_freshness": value,
        "domain_confidence": value,
    }


class TestCalculateAggregate(unittest.TestCase):
    def test_weighted_average(self):
        dimensions = {
            "source_quality": 1.0,
            "retrieval_coverage": 0.0,
            "internal_consistency": 0.0,
            "temporal_freshness": 0.0,
            "domain_confidence": 0.0,
        }
        self.assertAlmostEqual(calculate_aggregate(dimensions), 0.25)

    def test_uniform_scores(self):
        dimensions = _uniform_dimensions(0.8)
        self.assertAlmostEqual(calculate_aggregate(dimensions), 0.8)


class TestEvaluateThresholds(unittest.TestCase):
    def test_rc1_always_passes(self):
        dimensions = _uniform_dimensions(0.0)
        aggregate = calculate_aggregate(dimensions)
        result = evaluate_thresholds(aggregate, dimensions, "RC-1")

        self.assertTrue(result["passed"])
        self.assertEqual(result["failed_dimensions"], [])
        self.assertEqual(result["required_aggregate"], 0.0)
        self.assertEqual(result["achieved_aggregate"], aggregate)

    def test_rc5_with_low_scores_fails(self):
        dimensions = _uniform_dimensions(0.5)
        aggregate = calculate_aggregate(dimensions)
        result = evaluate_thresholds(aggregate, dimensions, "RC-5")

        self.assertFalse(result["passed"])
        self.assertEqual(result["required_aggregate"], 0.90)
        self.assertAlmostEqual(result["achieved_aggregate"], 0.5)

    def test_high_aggregate_fails_when_one_dimension_below_minimum(self):
        dimensions = {
            "source_quality": 0.55,
            "retrieval_coverage": 0.95,
            "internal_consistency": 0.95,
            "temporal_freshness": 0.95,
            "domain_confidence": 0.95,
        }
        aggregate = calculate_aggregate(dimensions)
        self.assertGreater(aggregate, 0.70)

        result = evaluate_thresholds(aggregate, dimensions, "RC-3")

        self.assertFalse(result["passed"])
        self.assertEqual(len(result["failed_dimensions"]), 1)
        self.assertEqual(result["failed_dimensions"][0]["dimension"], "source_quality")
        self.assertAlmostEqual(result["failed_dimensions"][0]["value"], 0.55)
        self.assertAlmostEqual(result["failed_dimensions"][0]["required"], 0.60)


class TestCalculateChainHash(unittest.TestCase):
    def test_deterministic_hash(self):
        receipt_data = {"query_hash": "abc", "status": "pass"}
        previous_hash = "genesis"

        expected_payload = json.dumps(receipt_data, sort_keys=True) + previous_hash
        expected = hashlib.sha256(expected_payload.encode()).hexdigest()

        self.assertEqual(calculate_chain_hash(receipt_data, previous_hash), expected)

    def test_different_previous_hash_produces_different_result(self):
        receipt_data = {"query_hash": "abc"}
        hash_a = calculate_chain_hash(receipt_data, "hash_a")
        hash_b = calculate_chain_hash(receipt_data, "hash_b")
        self.assertNotEqual(hash_a, hash_b)


class TestBuildFailureReason(unittest.TestCase):
    def test_describes_aggregate_and_dimension_failures(self):
        evaluation = {
            "achieved_aggregate": 0.75,
            "required_aggregate": 0.90,
            "failed_dimensions": [
                {
                    "dimension": "source_quality",
                    "value": 0.55,
                    "required": 0.80,
                    "shortfall": 0.25,
                }
            ],
        }

        reason = build_failure_reason(evaluation, "RC-5")

        self.assertIn("Aggregate confidence 0.75", reason)
        self.assertIn("required 0.90 for RC-5", reason)
        self.assertIn("source_quality scored 0.55", reason)
        self.assertIn("shortfall: 0.25", reason)


class TestCheckPartialAvailability(unittest.TestCase):
    def test_fails_at_rc4_but_available_at_rc2(self):
        dimensions = _uniform_dimensions(0.55)
        result = check_partial_availability(dimensions, "RC-4")

        self.assertTrue(result["available"])
        self.assertEqual(result["at_level"], "RC-2")

    def test_no_lower_level_available_at_rc1(self):
        dimensions = _uniform_dimensions(0.0)
        result = check_partial_availability(dimensions, "RC-1")

        self.assertFalse(result["available"])
        self.assertIsNone(result["at_level"])

    def test_returns_highest_qualifying_lower_level(self):
        dimensions = _uniform_dimensions(0.75)
        result = check_partial_availability(dimensions, "RC-5")

        self.assertTrue(result["available"])
        self.assertEqual(result["at_level"], "RC-3")


if __name__ == "__main__":
    unittest.main()
