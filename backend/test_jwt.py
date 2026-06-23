import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from jwt_handler import (
    REQUIRED_CLAIMS,
    InvalidTokenSignatureError,
    TokenExpiredError,
    generate_token,
    get_token_hash,
    validate_token,
)

TEST_ENV = {
    "JWT_SECRET": "test-secret-key",
    "SESSION_DURATION_HOURS": "24",
}


@patch.dict(os.environ, TEST_ENV)
class TestGenerateToken(unittest.TestCase):
    def test_generation_has_all_required_fields(self):
        result = generate_token("pi_test_123")

        self.assertIn("token", result)
        self.assertIn("token_hash", result)
        self.assertIn("expires_at", result)
        self.assertEqual(len(result["token_hash"]), 64)
        self.assertEqual(result["token_hash"], get_token_hash(result["token"]))

        payload = validate_token(result["token"])
        for claim in REQUIRED_CLAIMS:
            self.assertIn(claim, payload)
            self.assertTrue(payload[claim])

        self.assertEqual(payload["stripe_payment_intent_id"], "pi_test_123")


@patch.dict(os.environ, TEST_ENV)
class TestValidateToken(unittest.TestCase):
    def test_valid_token_passes_validation(self):
        result = generate_token("pi_test_456")
        payload = validate_token(result["token"])

        self.assertEqual(payload["stripe_payment_intent_id"], "pi_test_456")
        self.assertEqual(payload["jti"], validate_token(result["token"])["jti"])

    def test_expired_token_raises_exception(self):
        result = generate_token("pi_test_789")
        expires_at = datetime.fromisoformat(result["expires_at"])

        with patch("jwt_handler.datetime") as mock_datetime:
            mock_datetime.now.return_value = expires_at + timedelta(hours=1)
            mock_datetime.fromisoformat = datetime.fromisoformat
            mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)

            with self.assertRaises(TokenExpiredError):
                validate_token(result["token"])

    def test_tampered_token_raises_exception(self):
        result = generate_token("pi_test_tamper")
        header, payload, signature = result["token"].split(".")
        tampered = f"{header}.{payload}.{'X' + signature[1:]}"

        with self.assertRaises(InvalidTokenSignatureError):
            validate_token(tampered)


if __name__ == "__main__":
    unittest.main()
