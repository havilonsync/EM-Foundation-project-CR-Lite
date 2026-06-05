import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app


def _sample_receipt(receipt_id: str = "receipt-3", previous_id: str | None = "receipt-2"):
    return {
        "id": receipt_id,
        "created_at": "2026-06-05T12:00:00",
        "query_hash": "hash",
        "query_text": "What is the capital of France?",
        "reliance_level": "RC-3",
        "status": "FAILURE",
        "aggregate_confidence": 0.55,
        "source_quality": 0.55,
        "retrieval_coverage": 0.95,
        "internal_consistency": 0.95,
        "temporal_freshness": 0.95,
        "domain_confidence": 0.95,
        "contradictions_count": 0,
        "output_text": None,
        "failure_reason": "Aggregate confidence 0.55 is below required 0.70 for RC-3.",
        "partial_available": True,
        "partial_rc_level": "RC-2",
        "human_review_required": True,
        "previous_receipt_id": previous_id,
        "chain_hash": "abc123",
        "ocms_payload": {
            "answer": "Paris",
            "confidence": {
                "source_quality": 0.55,
                "retrieval_coverage": 0.95,
                "internal_consistency": 0.95,
                "temporal_freshness": 0.95,
                "domain_confidence": 0.95,
            },
            "contradictions": [],
            "coverage_gaps": [],
            "domain": "geography",
            "freshness_note": "stable",
            "evaluation": {
                "passed": False,
                "failed_dimensions": [],
                "required_aggregate": 0.70,
                "achieved_aggregate": 0.55,
            },
        },
    }


class TestHealthEndpoint(unittest.TestCase):
    @patch("main.check_db_connection", return_value=True)
    def test_health_returns_ok_when_db_connected(self, _mock_check):
        with TestClient(app) as client:
            response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "db": "connected"})
        self.assertEqual(response.headers["content-type"], "application/json")

    @patch("main.check_db_connection", side_effect=ValueError("DATABASE_URL is not set"))
    def test_health_returns_503_when_db_unavailable(self, _mock_check):
        with TestClient(app) as client:
            response = client.get("/health")

        self.assertEqual(response.status_code, 503)
        self.assertIn("detail", response.json())


class TestReceiptEndpoints(unittest.TestCase):
    @patch("main.get_receipt_by_id")
    def test_get_receipt_enriches_response(self, mock_get_receipt):
        mock_get_receipt.return_value = _sample_receipt()

        with TestClient(app) as client:
            response = client.get("/api/receipts/receipt-3")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "receipt-3")
        self.assertEqual(data["failed_dimensions"], ["source_quality"])
        self.assertEqual(data["required_action"], "human-expert-review")

    @patch("main.get_receipt_by_id", return_value=None)
    def test_get_receipt_returns_404(self, _mock_get_receipt):
        with TestClient(app) as client:
            response = client.get("/api/receipts/missing")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Receipt not found")

    @patch("main.get_receipt_chain")
    def test_get_receipt_chain_returns_ordered_array(self, mock_get_chain):
        mock_get_chain.return_value = [
            enrich_receipt(_sample_receipt("receipt-1", None)),
            enrich_receipt(_sample_receipt("receipt-2", "receipt-1")),
            enrich_receipt(_sample_receipt("receipt-3", "receipt-2")),
        ]

        with TestClient(app) as client:
            response = client.get("/api/receipts/receipt-3/chain")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 3)
        self.assertEqual(data[0]["id"], "receipt-1")
        self.assertEqual(data[-1]["id"], "receipt-3")

    @patch("main.get_receipt_chain", return_value=None)
    def test_get_receipt_chain_returns_404(self, _mock_get_chain):
        with TestClient(app) as client:
            response = client.get("/api/receipts/missing/chain")

        self.assertEqual(response.status_code, 404)


class TestValidationAndErrors(unittest.TestCase):
    def test_invalid_reliance_level_returns_422_json(self):
        with TestClient(app) as client:
            response = client.post(
                "/api/query",
                json={"query": "test", "reliance_level": "RC-9"},
            )

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.headers["content-type"], "application/json")
        self.assertIn("detail", response.json())

    @patch("main.query_claude", side_effect=RuntimeError("API down"))
    def test_claude_failure_returns_503_json(self, _mock_query):
        with TestClient(app) as client:
            response = client.post(
                "/api/query",
                json={"query": "test", "reliance_level": "RC-1"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertIn("Claude API unavailable", response.json()["detail"])


def enrich_receipt(receipt):
    from logic import enrich_receipt_response

    return enrich_receipt_response(receipt)


if __name__ == "__main__":
    unittest.main()
