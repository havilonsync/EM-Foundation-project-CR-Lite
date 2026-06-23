import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient

from jwt_handler import (
    InvalidTokenSignatureError,
    TokenExpiredError,
    get_token_hash,
)
from main import app

TEST_ENV = {
    "JWT_SECRET": "test-secret-key",
    "SESSION_QUERY_LIMIT": "10",
}


def _query_payload():
    return {"query": "test", "reliance_level": "RC-1"}


def _valid_session_row(query_count: int = 0, token_hash: str = "abc123"):
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    return {
        "id": "session-1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires.isoformat(),
        "stripe_payment_intent_id": "pi_test_123",
        "token_hash": token_hash,
        "query_count": query_count,
        "is_revoked": False,
    }


def _claude_response():
    return {
        "answer": "Paris",
        "confidence": {
            "source_quality": 0.9,
            "retrieval_coverage": 0.9,
            "internal_consistency": 0.9,
            "temporal_freshness": 0.9,
            "domain_confidence": 0.9,
        },
        "contradictions": [],
        "coverage_gaps": [],
        "domain": "geography",
        "freshness_note": "stable",
    }


def _sample_receipt():
    return {
        "id": "receipt-1",
        "created_at": "2026-06-05T12:00:00",
        "query_hash": "hash",
        "query_text": "test",
        "reliance_level": "RC-1",
        "status": "PASS",
        "aggregate_confidence": 0.9,
        "source_quality": 0.9,
        "retrieval_coverage": 0.9,
        "internal_consistency": 0.9,
        "temporal_freshness": 0.9,
        "domain_confidence": 0.9,
        "contradictions_count": 0,
        "output_text": "Paris",
        "failure_reason": None,
        "partial_available": False,
        "partial_rc_level": None,
        "human_review_required": False,
        "previous_receipt_id": None,
        "chain_hash": "abc123",
        "ocms_payload": {
            "answer": "Paris",
            "confidence": _claude_response()["confidence"],
            "contradictions": [],
            "coverage_gaps": [],
            "domain": "geography",
            "freshness_note": "stable",
            "evaluation": {
                "passed": True,
                "failed_dimensions": [],
                "required_aggregate": 0.0,
                "achieved_aggregate": 0.9,
            },
        },
    }


@patch.dict(os.environ, TEST_ENV)
class TestQueryAuth(unittest.TestCase):
    def test_request_without_token_returns_401(self):
        with TestClient(app) as client:
            response = client.post("/api/query", json=_query_payload())

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "No token provided")

    @patch("main.validate_token", side_effect=InvalidTokenSignatureError("bad"))
    def test_request_with_invalid_token_returns_401(self, _mock_validate):
        with TestClient(app) as client:
            response = client.post(
                "/api/query",
                json=_query_payload(),
                headers={"Authorization": "Bearer invalid.token"},
            )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid or expired token")

    @patch("main.validate_token", side_effect=TokenExpiredError("expired"))
    def test_request_with_expired_token_returns_401(self, _mock_validate):
        with TestClient(app) as client:
            response = client.post(
                "/api/query",
                json=_query_payload(),
                headers={"Authorization": "Bearer expired.token"},
            )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["detail"], "Invalid or expired token")

    @patch("main.query_claude")
    @patch("main.get_session_token")
    @patch("main.validate_token", return_value={})
    def test_request_after_10_queries_returns_429(
        self, _mock_validate, mock_get_session, mock_query_claude
    ):
        mock_get_session.return_value = _valid_session_row(query_count=10)

        with TestClient(app) as client:
            response = client.post(
                "/api/query",
                json=_query_payload(),
                headers={"Authorization": "Bearer valid.jwt.token"},
            )

        self.assertEqual(response.status_code, 429)
        self.assertEqual(
            response.json()["detail"],
            "Query limit reached. Please donate again to continue.",
        )
        mock_query_claude.assert_not_called()

    @patch("main.increment_query_count")
    @patch("main.save_receipt")
    @patch("main.get_latest_chain_hash", return_value="")
    @patch("main.get_latest_receipt", return_value=None)
    @patch("main.query_claude")
    @patch("main.get_session_token")
    @patch("main.validate_token", return_value={})
    def test_valid_token_passes_through(
        self,
        _mock_validate,
        mock_get_session,
        mock_query_claude,
        _mock_latest,
        _mock_hash,
        mock_save_receipt,
        mock_increment,
    ):
        token = "valid.jwt.token"
        token_hash = get_token_hash(token)
        mock_get_session.return_value = _valid_session_row(
            query_count=0, token_hash=token_hash
        )
        mock_query_claude.return_value = _claude_response()
        mock_save_receipt.return_value = _sample_receipt()

        with TestClient(app) as client:
            response = client.post(
                "/api/query",
                json=_query_payload(),
                headers={"Authorization": f"Bearer {token}"},
            )

        self.assertEqual(response.status_code, 200)
        mock_query_claude.assert_called_once_with("test")
        mock_increment.assert_called_once_with(token_hash)


if __name__ == "__main__":
    unittest.main()
