import hashlib
import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from dotenv import load_dotenv
from jose import jwt
from jose.exceptions import JWTError, JWSError

load_dotenv()

REQUIRED_CLAIMS = ("issued_at", "expires_at", "stripe_payment_intent_id", "jti")


class InvalidTokenSignatureError(Exception):
    pass


class TokenExpiredError(Exception):
    pass


class InvalidTokenPayloadError(Exception):
    pass


def _get_jwt_secret() -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise ValueError("JWT_SECRET is not set")
    return secret


def _get_session_duration_hours() -> int:
    return int(os.getenv("SESSION_DURATION_HOURS", "24"))


def get_token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_token(stripe_payment_intent_id: str) -> dict:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=_get_session_duration_hours())
    payload = {
        "issued_at": now.isoformat(),
        "expires_at": expires.isoformat(),
        "stripe_payment_intent_id": stripe_payment_intent_id,
        "jti": str(uuid4()),
    }
    token = jwt.encode(payload, _get_jwt_secret(), algorithm="HS256")
    return {
        "token": token,
        "token_hash": get_token_hash(token),
        "expires_at": expires.isoformat(),
    }


def _parse_iso_timestamp(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def validate_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=["HS256"])
    except (JWTError, JWSError) as exc:
        raise InvalidTokenSignatureError("Invalid token signature") from exc

    for claim in REQUIRED_CLAIMS:
        if claim not in payload or not payload[claim]:
            raise InvalidTokenPayloadError(f'Missing required field "{claim}"')

    expires_at = _parse_iso_timestamp(payload["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise TokenExpiredError("Token has expired")

    return payload
