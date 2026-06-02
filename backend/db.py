import os
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from uuid import UUID

import psycopg2
from dotenv import load_dotenv
from psycopg2 import errors as psycopg2_errors
from psycopg2.extras import Json, RealDictCursor

load_dotenv()

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def get_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL is not set")
    return psycopg2.connect(database_url)


def serialize_receipt(row: dict) -> dict:
    result = {}
    for key, value in row.items():
        if isinstance(value, UUID):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, Decimal):
            result[key] = float(value)
        else:
            result[key] = value
    return result


def run_migrations():
    migration_file = MIGRATIONS_DIR / "001_create_receipts.sql"
    with open(migration_file) as f:
        sql = f.read()

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                try:
                    cur.execute(sql)
                except psycopg2_errors.DuplicateTable:
                    pass
    finally:
        conn.close()


def get_latest_chain_hash():
    latest = get_latest_receipt()
    if latest and latest.get("chain_hash"):
        return latest["chain_hash"]
    return ""


def get_latest_receipt():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, chain_hash
                FROM continuity_receipts
                ORDER BY created_at DESC
                LIMIT 1
                """
            )
            row = cur.fetchone()
            if row:
                return serialize_receipt(dict(row))
            return None
    finally:
        conn.close()


def get_recent_receipts(limit: int = 20):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM continuity_receipts
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            return [serialize_receipt(dict(row)) for row in cur.fetchall()]
    finally:
        conn.close()


def get_stats():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE status = 'PASS') AS pass_count,
                    COUNT(*) FILTER (WHERE status = 'FAILURE') AS failure_count,
                    AVG(source_quality) AS avg_source_quality,
                    AVG(retrieval_coverage) AS avg_retrieval_coverage,
                    AVG(internal_consistency) AS avg_internal_consistency,
                    AVG(temporal_freshness) AS avg_temporal_freshness,
                    AVG(domain_confidence) AS avg_domain_confidence
                FROM continuity_receipts
                """
            )
            row = dict(cur.fetchone())
            total = row["total"] or 0
            pass_count = row["pass_count"] or 0
            failure_count = row["failure_count"] or 0

            return {
                "total": total,
                "pass_count": pass_count,
                "failure_count": failure_count,
                "pass_rate": pass_count / total if total else 0.0,
                "failure_rate": failure_count / total if total else 0.0,
                "avg_confidence": {
                    "source_quality": float(row["avg_source_quality"] or 0),
                    "retrieval_coverage": float(row["avg_retrieval_coverage"] or 0),
                    "internal_consistency": float(row["avg_internal_consistency"] or 0),
                    "temporal_freshness": float(row["avg_temporal_freshness"] or 0),
                    "domain_confidence": float(row["avg_domain_confidence"] or 0),
                },
            }
    finally:
        conn.close()


def save_receipt(receipt_data: dict) -> dict:
    params = {
        "query_hash": receipt_data["query_hash"],
        "query_text": receipt_data["query_text"],
        "reliance_level": receipt_data["reliance_level"],
        "status": receipt_data["status"],
        "aggregate_confidence": receipt_data.get("aggregate_confidence"),
        "source_quality": receipt_data.get("source_quality"),
        "retrieval_coverage": receipt_data.get("retrieval_coverage"),
        "internal_consistency": receipt_data.get("internal_consistency"),
        "temporal_freshness": receipt_data.get("temporal_freshness"),
        "domain_confidence": receipt_data.get("domain_confidence"),
        "contradictions_count": receipt_data.get("contradictions_count"),
        "output_text": receipt_data.get("output_text"),
        "failure_reason": receipt_data.get("failure_reason"),
        "partial_available": receipt_data.get("partial_available", False),
        "partial_rc_level": receipt_data.get("partial_rc_level"),
        "human_review_required": receipt_data.get("human_review_required"),
        "previous_receipt_id": receipt_data.get("previous_receipt_id"),
        "chain_hash": receipt_data.get("chain_hash"),
        "ocms_payload": Json(receipt_data["ocms_payload"]),
    }

    conn = get_connection()
    try:
        with conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO continuity_receipts (
                        query_hash,
                        query_text,
                        reliance_level,
                        status,
                        aggregate_confidence,
                        source_quality,
                        retrieval_coverage,
                        internal_consistency,
                        temporal_freshness,
                        domain_confidence,
                        contradictions_count,
                        output_text,
                        failure_reason,
                        partial_available,
                        partial_rc_level,
                        human_review_required,
                        previous_receipt_id,
                        chain_hash,
                        ocms_payload
                    ) VALUES (
                        %(query_hash)s,
                        %(query_text)s,
                        %(reliance_level)s,
                        %(status)s,
                        %(aggregate_confidence)s,
                        %(source_quality)s,
                        %(retrieval_coverage)s,
                        %(internal_consistency)s,
                        %(temporal_freshness)s,
                        %(domain_confidence)s,
                        %(contradictions_count)s,
                        %(output_text)s,
                        %(failure_reason)s,
                        %(partial_available)s,
                        %(partial_rc_level)s,
                        %(human_review_required)s,
                        %(previous_receipt_id)s,
                        %(chain_hash)s,
                        %(ocms_payload)s
                    )
                    RETURNING *
                    """,
                    params,
                )
                return serialize_receipt(dict(cur.fetchone()))
    finally:
        conn.close()
