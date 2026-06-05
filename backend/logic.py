import hashlib
import json

RELIANCE_THRESHOLDS = {
    "RC-1": {"aggregate": 0.0,  "min_dimension": 0.0,  "human_review": False},
    "RC-2": {"aggregate": 0.50, "min_dimension": 0.40, "human_review": False},
    "RC-3": {"aggregate": 0.70, "min_dimension": 0.60, "human_review": True},
    "RC-4": {"aggregate": 0.85, "min_dimension": 0.70, "human_review": True},
    "RC-5": {"aggregate": 0.90, "min_dimension": 0.80, "human_review": True},
}

DIMENSION_WEIGHTS = {
    "source_quality":       0.25,
    "retrieval_coverage":   0.20,
    "internal_consistency": 0.25,
    "temporal_freshness":   0.15,
    "domain_confidence":    0.15,
}

RC_LEVELS = ["RC-1", "RC-2", "RC-3", "RC-4", "RC-5"]


def calculate_aggregate(dimensions: dict) -> float:
    return sum(
        dimensions.get(dim, 0) * weight
        for dim, weight in DIMENSION_WEIGHTS.items()
    )


# PASS/FAIL rules: a receipt PASSES only when both conditions hold for the
# chosen reliance level (RC-1 … RC-5). (1) The weighted aggregate confidence
# must meet or exceed the level's aggregate threshold. (2) Every individual
# dimension must meet or exceed the level's minimum dimension floor. If either
# the aggregate or any single dimension falls short, the receipt FAILS and the
# failed dimensions are recorded with their shortfalls.
def evaluate_thresholds(aggregate: float, dimensions: dict, reliance_level: str) -> dict:
    threshold = RELIANCE_THRESHOLDS[reliance_level]
    required_aggregate = threshold["aggregate"]
    min_dimension = threshold["min_dimension"]

    failed_dimensions = []
    for dim in DIMENSION_WEIGHTS:
        value = dimensions.get(dim, 0)
        if value < min_dimension:
            failed_dimensions.append({
                "dimension": dim,
                "value": value,
                "required": min_dimension,
                "shortfall": min_dimension - value,
            })

    passed = aggregate >= required_aggregate and not failed_dimensions

    return {
        "passed": passed,
        "failed_dimensions": failed_dimensions,
        "required_aggregate": required_aggregate,
        "achieved_aggregate": aggregate,
    }


# Chain hash: SHA-256 of the canonical JSON receipt payload (sorted keys) concatenated
# with the previous receipt's chain hash. The first receipt uses an empty string as
# the previous hash. Any change to receipt content or chain position produces a
# different hash, linking each receipt to its predecessor.
def calculate_chain_hash(receipt_data: dict, previous_hash: str) -> str:
    payload = json.dumps(receipt_data, sort_keys=True) + previous_hash
    return hashlib.sha256(payload.encode()).hexdigest()


def build_failure_reason(evaluation: dict, reliance_level: str) -> str:
    parts = []

    if evaluation["achieved_aggregate"] < evaluation["required_aggregate"]:
        parts.append(
            f"Aggregate confidence {evaluation['achieved_aggregate']:.2f} is below "
            f"required {evaluation['required_aggregate']:.2f} for {reliance_level}."
        )

    for failure in evaluation["failed_dimensions"]:
        parts.append(
            f"{failure['dimension']} scored {failure['value']:.2f}, below minimum "
            f"{failure['required']:.2f} (shortfall: {failure['shortfall']:.2f})."
        )

    return " ".join(parts)


def derive_required_action(reliance_level: str) -> str:
    mapping = {
        "RC-3": "human-expert-review",
        "RC-4": "professional-review",
        "RC-5": "safety-halt",
    }
    return mapping.get(reliance_level, "none")


def get_failed_dimension_names(receipt: dict) -> list[str]:
    dimensions = {dim: receipt[dim] for dim in DIMENSION_WEIGHTS}
    evaluation = evaluate_thresholds(
        receipt["aggregate_confidence"],
        dimensions,
        receipt["reliance_level"],
    )
    return [failure["dimension"] for failure in evaluation["failed_dimensions"]]


def enrich_receipt_response(receipt: dict) -> dict:
    return {
        **receipt,
        "failed_dimensions": get_failed_dimension_names(receipt),
        "required_action": derive_required_action(receipt["reliance_level"]),
    }


def check_partial_availability(dimensions: dict, current_rc: str) -> dict:
    aggregate = calculate_aggregate(dimensions)
    current_index = RC_LEVELS.index(current_rc)

    for level in reversed(RC_LEVELS[:current_index]):
        evaluation = evaluate_thresholds(aggregate, dimensions, level)
        if evaluation["passed"]:
            return {"available": True, "at_level": level}

    return {"available": False, "at_level": None}
