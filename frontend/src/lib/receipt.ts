import type { FailureReceiptProps } from "@/components/FailureReceipt";
import type { NutritionLabelProps } from "@/components/NutritionLabel";
import type { ProvenanceDiagramProps } from "@/components/Provenancediagram";

import type { RelianceLevel } from "./rc-levels";

type ConfidenceDimensions = {
  source_quality: number;
  retrieval_coverage: number;
  internal_consistency: number;
  temporal_freshness: number;
  domain_confidence: number;
};

type FailedDimensionEvaluation = {
  dimension: string;
  value: number;
  required: number;
  shortfall: number;
};

type ReceiptEvaluation = {
  passed: boolean;
  failed_dimensions: FailedDimensionEvaluation[];
  required_aggregate: number;
  achieved_aggregate: number;
};

export type OcmsPayload = {
  answer: string;
  confidence: ConfidenceDimensions;
  contradictions: string[];
  coverage_gaps: string[];
  domain: string;
  freshness_note: string;
  evaluation: ReceiptEvaluation;
};

export type ContinuityReceipt = {
  id: string;
  created_at: string;
  query_hash: string;
  query_text: string;
  reliance_level: RelianceLevel;
  status: "PASS" | "FAILURE";
  aggregate_confidence: number;
  source_quality: number;
  retrieval_coverage: number;
  internal_consistency: number;
  temporal_freshness: number;
  domain_confidence: number;
  contradictions_count: number;
  output_text: string | null;
  failure_reason: string | null;
  partial_available: boolean;
  partial_rc_level: string | null;
  human_review_required: boolean;
  previous_receipt_id: string | null;
  chain_hash: string;
  ocms_payload: OcmsPayload;
};

export type ReceiptsPageResponse = {
  items: ContinuityReceipt[];
  total: number;
  page: number;
  limit: number;
};

export type RelianceLevelStats = {
  level: string;
  count: number;
  pass_count: number;
  pass_rate: number;
};

export type StatsResponse = {
  total: number;
  pass_count: number;
  failure_count: number;
  pass_rate: number;
  failure_rate: number;
  avg_confidence: ConfidenceDimensions;
  by_reliance_level: RelianceLevelStats[];
};

const DIMENSION_LABELS: Record<keyof ConfidenceDimensions, string> = {
  source_quality: "Source Quality",
  retrieval_coverage: "Retrieval Coverage",
  internal_consistency: "Internal Consistency",
  temporal_freshness: "Temporal Freshness",
  domain_confidence: "Domain Confidence",
};

export function truncateText(text: string, max = 50): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function formatAggregatePercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDimensionName(key: string): string {
  return (
    DIMENSION_LABELS[key as keyof ConfidenceDimensions] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function deriveRequiredAction(relianceLevel: string): string {
  if (relianceLevel === "RC-5") return "safety-halt";
  if (relianceLevel === "RC-4") return "professional-review";
  return "human-expert-review";
}

export function getReceiptDimensions(
  receipt: ContinuityReceipt,
): ConfidenceDimensions {
  return {
    source_quality: receipt.source_quality,
    retrieval_coverage: receipt.retrieval_coverage,
    internal_consistency: receipt.internal_consistency,
    temporal_freshness: receipt.temporal_freshness,
    domain_confidence: receipt.domain_confidence,
  };
}

export function getReceiptAnswer(receipt: ContinuityReceipt): string | null {
  return receipt.output_text ?? receipt.ocms_payload?.answer ?? null;
}

export function toNutritionLabelProps(
  receipt: ContinuityReceipt,
): NutritionLabelProps {
  return {
    status: receipt.status,
    reliance_level: receipt.reliance_level,
    aggregate_confidence: receipt.aggregate_confidence,
    dimensions: getReceiptDimensions(receipt),
    contradictions: receipt.ocms_payload?.contradictions ?? [],
    coverage_gaps: receipt.ocms_payload?.coverage_gaps ?? [],
    human_review_required: receipt.human_review_required,
  };
}

export function toFailureReceiptProps(
  receipt: ContinuityReceipt,
): FailureReceiptProps {
  const evaluation = receipt.ocms_payload.evaluation;

  return {
    reliance_level: receipt.reliance_level,
    required_aggregate: evaluation.required_aggregate,
    achieved_aggregate: evaluation.achieved_aggregate,
    failed_dimensions: evaluation.failed_dimensions.map((failure) => ({
      name: formatDimensionName(failure.dimension),
      required: failure.required,
      achieved: failure.value,
    })),
    failure_reason: receipt.failure_reason ?? "",
    partial_available: receipt.partial_available,
    partial_rc_level: receipt.partial_rc_level,
    required_action: deriveRequiredAction(receipt.reliance_level),
  };
}

export function toProvenanceDiagramProps(
  receipt: ContinuityReceipt,
): ProvenanceDiagramProps {
  return {
    query: receipt.query_text,
    sources_retrieved: 0,
    dimensions: getReceiptDimensions(receipt),
    status: receipt.status,
    contradictions: receipt.ocms_payload?.contradictions ?? [],
    receipt_id: receipt.id,
  };
}

export function formatReceiptDate(isoDate: string): string {
  return new Date(isoDate).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
