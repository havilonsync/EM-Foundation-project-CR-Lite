import json
import os
import re

import anthropic
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are a continuity-aware reasoning system 
operating under the Continuity Receipts (CR) standard. 
For every query:

1. Generate your best answer
2. Assess confidence across five dimensions (0-1 each):
   - source_quality: Reliability of your sources
   - retrieval_coverage: Completeness of source coverage
   - internal_consistency: Absence of contradictions
   - temporal_freshness: Currency of information
   - domain_confidence: Your calibration in this domain
3. Identify contradictions in your knowledge
4. Identify significant coverage gaps

Return JSON only with these exact fields:
{
  "answer": "string",
  "confidence": {
    "source_quality": float,
    "retrieval_coverage": float,
    "internal_consistency": float,
    "temporal_freshness": float,
    "domain_confidence": float
  },
  "contradictions": ["string array, may be empty"],
  "coverage_gaps": ["string array"],
  "domain": "string",
  "freshness_note": "string"
}

Return ONLY valid JSON. No preamble, no markdown, no backticks."""

REQUIRED_FIELDS = (
    "answer",
    "confidence",
    "contradictions",
    "coverage_gaps",
    "domain",
    "freshness_note",
)

REQUIRED_CONFIDENCE_FIELDS = (
    "source_quality",
    "retrieval_coverage",
    "internal_consistency",
    "temporal_freshness",
    "domain_confidence",
)


def _strip_markdown_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    return text.strip()


def _validate_response(data: dict) -> dict:
    for field in REQUIRED_FIELDS:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")

    confidence = data["confidence"]
    if not isinstance(confidence, dict):
        raise ValueError("Field 'confidence' must be an object")

    for field in REQUIRED_CONFIDENCE_FIELDS:
        if field not in confidence:
            raise ValueError(f"Missing required confidence field: {field}")

    if not isinstance(data["contradictions"], list):
        raise ValueError("Field 'contradictions' must be an array")

    if not isinstance(data["coverage_gaps"], list):
        raise ValueError("Field 'coverage_gaps' must be an array")

    return data


def query_claude(user_query: str) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is not set")

    client = anthropic.Anthropic(api_key=api_key)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_query}],
    )

    raw_text = response.content[0].text
    cleaned = _strip_markdown_fences(raw_text)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Failed to parse Claude response as JSON: {exc}") from exc

    if not isinstance(data, dict):
        raise ValueError("Claude response must be a JSON object")

    return _validate_response(data)
