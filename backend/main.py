import hashlib
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from claude_client import query_claude
from db import get_recent_receipts, get_stats, get_latest_chain_hash, get_latest_receipt, run_migrations, save_receipt
from logic import (
    RELIANCE_THRESHOLDS,
    RC_LEVELS,
    build_failure_reason,
    calculate_aggregate,
    calculate_chain_hash,
    check_partial_availability,
    evaluate_thresholds,
)

load_dotenv()


def get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.on_event("startup")
def startup():
    run_migrations()


@app.post("/api/query")
def post_query(request: QueryRequest):
    claude_response = query_claude(request.query)

    dimensions = claude_response["confidence"]
    aggregate = calculate_aggregate(dimensions)
    evaluation = evaluate_thresholds(aggregate, dimensions, request.reliance_level)

    passed = evaluation["passed"]
    status = "PASS" if passed else "FAILURE"

    partial = check_partial_availability(dimensions, request.reliance_level)
    failure_reason = None if passed else build_failure_reason(evaluation, request.reliance_level)

    latest_receipt = get_latest_receipt()
    previous_receipt_id = latest_receipt["id"] if latest_receipt else None
    previous_hash = get_latest_chain_hash()

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
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return saved_receipt


@app.get("/api/receipts")
def list_receipts():
    return get_recent_receipts(limit=20)


@app.get("/api/stats")
def stats():
    return get_stats()
