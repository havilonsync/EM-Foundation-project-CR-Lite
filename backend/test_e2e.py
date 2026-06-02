#!/usr/bin/env python3
"""End-to-end tests for CR-Lite Milestone 1."""

import sys

from fastapi.testclient import TestClient

from db import get_recent_receipts, run_migrations
from main import app


def check(name: str, passed: bool, detail: str = "") -> bool:
    status = "PASS" if passed else "FAIL"
    suffix = f" — {detail}" if detail else ""
    print(f"  [{status}] {name}{suffix}")
    return passed


def main() -> int:
    print("CR-Lite E2E Tests (Milestone 1)\n")

    run_migrations()

    results: list[bool] = []
    first_chain_hash: str | None = None
    second_chain_hash: str | None = None

    with TestClient(app) as client:
        rc1_response = client.post(
            "/api/query",
            json={
                "query": "What is the capital of France?",
                "reliance_level": "RC-1",
            },
        )
        rc1_ok = rc1_response.status_code == 200
        rc1_data = rc1_response.json() if rc1_ok else {}

        results.append(
            check(
                "RC-1 query returns HTTP 200",
                rc1_ok,
                f"status={rc1_response.status_code}" if not rc1_ok else "",
            )
        )
        results.append(
            check(
                "RC-1 query status is PASS",
                rc1_data.get("status") == "PASS",
                f"got {rc1_data.get('status')!r}",
            )
        )

        first_chain_hash = rc1_data.get("chain_hash")
        first_receipt_id = rc1_data.get("id")
        results.append(
            check(
                "First receipt saved with chain_hash",
                bool(first_chain_hash) and bool(first_receipt_id),
                f"chain_hash={first_chain_hash!r}, id={first_receipt_id!r}",
            )
        )

        saved_in_db = any(r["id"] == first_receipt_id for r in get_recent_receipts(limit=50))
        results.append(
            check(
                "First receipt exists in database",
                saved_in_db,
                f"id={first_receipt_id!r}",
            )
        )

        rc5_response = client.post(
            "/api/query",
            json={
                "query": "What is the exact population of Tokyo as of today?",
                "reliance_level": "RC-5",
            },
        )
        rc5_ok = rc5_response.status_code == 200
        rc5_data = rc5_response.json() if rc5_ok else {}

        results.append(
            check(
                "RC-5 query returns HTTP 200",
                rc5_ok,
                f"status={rc5_response.status_code}" if not rc5_ok else "",
            )
        )
        results.append(
            check(
                "RC-5 query status is FAILURE",
                rc5_data.get("status") == "FAILURE",
                f"got {rc5_data.get('status')!r} (RC-5 requires aggregate >= 0.90)",
            )
        )

        second_chain_hash = rc5_data.get("chain_hash")
        second_receipt_id = rc5_data.get("id")
        results.append(
            check(
                "Second receipt saved with chain_hash",
                bool(second_chain_hash) and bool(second_receipt_id),
                f"chain_hash={second_chain_hash!r}, id={second_receipt_id!r}",
            )
        )
        results.append(
            check(
                "Second receipt chain_hash differs from first",
                bool(first_chain_hash)
                and bool(second_chain_hash)
                and first_chain_hash != second_chain_hash,
                f"first={first_chain_hash!r}, second={second_chain_hash!r}",
            )
        )
        results.append(
            check(
                "Second receipt links to first in chain",
                rc5_data.get("previous_receipt_id") == first_receipt_id,
                f"previous_receipt_id={rc5_data.get('previous_receipt_id')!r}",
            )
        )

    passed = sum(results)
    total = len(results)
    print(f"\nSummary: {passed}/{total} checks passed")

    if passed == total:
        print("Milestone 1 E2E: ALL PASS")
        return 0

    print("Milestone 1 E2E: SOME CHECKS FAILED")
    return 1


if __name__ == "__main__":
    sys.exit(main())
