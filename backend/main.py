import hashlib
import os
from datetime import datetime, timezone

import psycopg2
import stripe
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator

from claude_client import query_claude
from db import (
    check_db_connection,
    get_latest_chain_hash,
    get_latest_receipt,
    get_receipt_by_id,
    get_receipt_chain,
    get_receipts_page,
    get_session_token,
    get_token_by_payment_intent,
    get_stats,
    increment_query_count,
    run_migrations,
    save_receipt,
    save_session_token,
)
from jwt_handler import (
    InvalidTokenPayloadError,
    InvalidTokenSignatureError,
    TokenExpiredError,
    generate_token,
    get_token_hash,
    validate_token,
)
from logic import (
    RELIANCE_THRESHOLDS,
    RC_LEVELS,
    build_failure_reason,
    calculate_aggregate,
    calculate_chain_hash,
    check_partial_availability,
    enrich_receipt_response,
    evaluate_thresholds,
)
from stripe_handler import (
    create_checkout_session,
    get_payment_intent_from_session,
    verify_webhook,
)

load_dotenv()


def _get_session_query_limit() -> int:
    return int(os.getenv("SESSION_QUERY_LIMIT", "10"))


def _parse_iso_timestamp(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


async def validate_session_token(
    authorization: str = Header(None),
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")

    token = authorization[len("Bearer ") :]

    try:
        validate_token(token)
    except (InvalidTokenSignatureError, TokenExpiredError, InvalidTokenPayloadError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    token_hash = get_token_hash(token)
    session_row = get_session_token(token_hash)
    if not session_row:
        raise HTTPException(status_code=401, detail="Token not recognized")

    if session_row.get("is_revoked"):
        raise HTTPException(status_code=401, detail="Token has been revoked")

    expires_at = _parse_iso_timestamp(session_row["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Token expired")

    if session_row.get("query_count", 0) >= _get_session_query_limit():
        raise HTTPException(
            status_code=429,
            detail="Query limit reached. Please donate again to continue.",
        )

    return session_row


def get_cors_origins() -> list[str]:
    origins = []
    for key in ("CORS_ORIGINS", "FRONTEND_URL"):
        raw = os.getenv(key, "")
        origins.extend(origin.strip() for origin in raw.split(",") if origin.strip())
    if not origins:
        origins.append("http://localhost:3000")
    return list(dict.fromkeys(origins))


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=422,
        content={"detail": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(psycopg2.Error)
async def database_exception_handler(request, exc):
    return JSONResponse(
        status_code=503,
        content={"detail": "Database unavailable"},
    )


class QueryRequest(BaseModel):
    query: str
    reliance_level: str

    @field_validator("reliance_level")
    @classmethod
    def validate_reliance_level(cls, value: str) -> str:
        if value not in RC_LEVELS:
            raise ValueError(f"reliance_level must be one of {', '.join(RC_LEVELS)}")
        return value


class CheckoutRequest(BaseModel):
    success_url: str
    cancel_url: str


@app.on_event("startup")
def startup():
    run_migrations()


@app.get("/health")
def health():
    try:
        if not check_db_connection():
            raise HTTPException(
                status_code=503,
                detail={"status": "error", "db": "disconnected"},
            )
    except (psycopg2.Error, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "error",
                "db": "disconnected",
                "message": str(exc),
            },
        ) from exc

    return {"status": "ok", "db": "connected"}


@app.post("/api/query")
def post_query(
    request: QueryRequest,
    token_data: dict = Depends(validate_session_token),
):
    try:
        claude_response = query_claude(request.query)
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Claude API unavailable: {exc}",
        ) from exc

    dimensions = claude_response["confidence"]
    aggregate = calculate_aggregate(dimensions)
    evaluation = evaluate_thresholds(aggregate, dimensions, request.reliance_level)

    passed = evaluation["passed"]
    status = "PASS" if passed else "FAILURE"

    partial = check_partial_availability(dimensions, request.reliance_level)
    failure_reason = None if passed else build_failure_reason(evaluation, request.reliance_level)

    try:
        latest_receipt = get_latest_receipt()
        previous_receipt_id = latest_receipt["id"] if latest_receipt else None
        previous_hash = get_latest_chain_hash()
    except (psycopg2.Error, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {exc}",
        ) from exc

    ocms_payload = {
        "answer": claude_response["answer"],
        "confidence": dimensions,
        "contradictions": claude_response["contradictions"],
        "coverage_gaps": claude_response["coverage_gaps"],
        "domain": claude_response["domain"],
        "freshness_note": claude_response["freshness_note"],
        "evaluation": evaluation,
    }

    receipt_data = {
        "query_hash": hashlib.sha256(request.query.encode()).hexdigest(),
        "query_text": request.query,
        "reliance_level": request.reliance_level,
        "status": status,
        "aggregate_confidence": round(aggregate, 2),
        "source_quality": dimensions["source_quality"],
        "retrieval_coverage": dimensions["retrieval_coverage"],
        "internal_consistency": dimensions["internal_consistency"],
        "temporal_freshness": dimensions["temporal_freshness"],
        "domain_confidence": dimensions["domain_confidence"],
        "contradictions_count": len(claude_response["contradictions"]),
        "output_text": claude_response["answer"] if passed else None,
        "failure_reason": failure_reason,
        "partial_available": partial["available"] if not passed else False,
        "partial_rc_level": partial["at_level"] if not passed else None,
        "human_review_required": RELIANCE_THRESHOLDS[request.reliance_level]["human_review"],
        "previous_receipt_id": previous_receipt_id,
        "ocms_payload": ocms_payload,
    }

    receipt_data["chain_hash"] = calculate_chain_hash(receipt_data, previous_hash)

    try:
        saved_receipt = save_receipt(receipt_data)
    except (psycopg2.Error, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {exc}",
        ) from exc

    increment_query_count(token_data["token_hash"])

    return enrich_receipt_response(saved_receipt)


@app.get("/api/receipts")
def list_receipts(page: int = 1, limit: int = 20):
    try:
        return get_receipts_page(page=page, limit=limit)
    except (psycopg2.Error, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {exc}",
        ) from exc


@app.get("/api/receipts/{receipt_id}/chain")
def get_receipt_chain_endpoint(receipt_id: str):
    try:
        chain = get_receipt_chain(receipt_id)
    except (psycopg2.Error, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {exc}",
        ) from exc

    if chain is None:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return chain


@app.get("/api/receipts/{receipt_id}")
def get_receipt(receipt_id: str):
    try:
        receipt = get_receipt_by_id(receipt_id)
    except (psycopg2.Error, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {exc}",
        ) from exc

    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return enrich_receipt_response(receipt)


@app.get("/api/stats")
def stats():
    try:
        return get_stats()
    except (psycopg2.Error, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {exc}",
        ) from exc


@app.post("/api/stripe/checkout")
def stripe_checkout(request: CheckoutRequest):
    try:
        result = create_checkout_session(request.success_url, request.cancel_url)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except stripe.error.StripeError as exc:
        raise HTTPException(status_code=503, detail=f"Stripe unavailable: {exc}") from exc
    return {"checkout_url": result["checkout_url"]}


@app.post("/api/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        event = verify_webhook(payload, sig_header)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event.get("type") != "checkout.session.completed":
        return {"received": True}

    session = event["data"]["object"]
    payment_intent = session.get("payment_intent")
    if isinstance(payment_intent, dict):
        payment_intent_id = payment_intent.get("id")
    else:
        payment_intent_id = payment_intent

    if not payment_intent_id:
        raise HTTPException(status_code=400, detail="Missing payment_intent")

    token_data = generate_token(payment_intent_id)
    expires_at = datetime.fromisoformat(
        token_data["expires_at"].replace("Z", "+00:00")
    )
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    checkout_session_id = session.get("id")

    try:
        save_session_token(
            token_data["token_hash"],
            expires_at,
            payment_intent_id,
            checkout_session_id=checkout_session_id,
            jwt_token=token_data["token"],
        )
    except (psycopg2.Error, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {exc}",
        ) from exc

    return {
        "token": token_data["token"],
        "expires_at": token_data["expires_at"],
    }


@app.get("/api/stripe/token")
def get_stripe_token(session_id: str):
    try:
        payment_intent_id = get_payment_intent_from_session(session_id)
        row = get_token_by_payment_intent(payment_intent_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except stripe.error.StripeError as exc:
        raise HTTPException(status_code=503, detail=f"Stripe unavailable: {exc}") from exc
    except (psycopg2.Error, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Database unavailable: {exc}",
        ) from exc

    if not row:
        raise HTTPException(status_code=404, detail="Token not ready")

    return {"token": row["token"], "expires_at": row["expires_at"]}
