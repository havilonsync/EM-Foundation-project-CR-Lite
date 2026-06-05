type RelianceLevel = "RC-1" | "RC-2" | "RC-3" | "RC-4" | "RC-5";
type ReceiptStatus = "PASS" | "FAILURE";

type ConfidenceDimensions = {
  source_quality: number;
  retrieval_coverage: number;
  internal_consistency: number;
  temporal_freshness: number;
  domain_confidence: number;
};

export type NutritionLabelProps = {
  status: ReceiptStatus;
  reliance_level: RelianceLevel;
  aggregate_confidence: number;
  dimensions: ConfidenceDimensions;
  contradictions: string[];
  coverage_gaps: string[];
  human_review_required: boolean;
};

const DIMENSION_ROWS: Array<{
  key: keyof ConfidenceDimensions;
  label: string;
}> = [
  { key: "source_quality", label: "Source Quality" },
  { key: "retrieval_coverage", label: "Retrieval Coverage" },
  { key: "internal_consistency", label: "Internal Consistency" },
  { key: "temporal_freshness", label: "Temporal Freshness" },
  { key: "domain_confidence", label: "Domain Confidence" },
];

function getScoreColor(score: number): string {
  if (score >= 0.75) return "var(--green)";
  if (score >= 0.5) return "var(--gold)";
  return "var(--red)";
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatScore(value: number): string {
  return value.toFixed(2);
}

function Divider() {
  return (
    <div
      className="h-px w-full"
      style={{ backgroundColor: "var(--rule)" }}
      aria-hidden="true"
    />
  );
}

export default function NutritionLabel({
  status,
  reliance_level,
  aggregate_confidence,
  dimensions,
  contradictions,
  coverage_gaps,
  human_review_required,
}: NutritionLabelProps) {
  const statusColor = status === "PASS" ? "var(--green)" : "var(--red)";
  const statusLabel = status === "PASS" ? "PASS" : "FAIL";

  return (
    <div
      className="receipt-gold-border mx-auto w-full max-w-md rounded-none"
      style={{
        backgroundColor: "var(--white)",
        fontFamily: "var(--font-ui)",
        color: "var(--stone)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-lg font-bold" style={{ color: statusColor }}>
          {statusLabel}
        </span>
        <span
          className="border px-2 py-0.5 text-sm font-semibold"
          style={{
            borderColor: "var(--accent)",
            color: "var(--accent)",
            backgroundColor: "var(--light-blue)",
          }}
        >
          {reliance_level}
        </span>
      </div>

      <Divider />

      <div className="px-4 py-3">
        <p className="text-sm font-semibold">Aggregate Continuity Score</p>
        <p
          className="mt-1 text-4xl font-bold leading-none"
          style={{ color: statusColor }}
        >
          {formatPercent(aggregate_confidence)}
        </p>
      </div>

      <Divider />

      <div className="px-4 py-3">
        <p className="mb-3 text-sm font-semibold">Confidence Dimensions</p>
        <div className="flex flex-col gap-3">
          {DIMENSION_ROWS.map(({ key, label }) => {
            const score = dimensions[key];
            const color = getScoreColor(score);

            return (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-semibold" style={{ color }}>
                    {formatScore(score)}
                  </span>
                </div>
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: "var(--rule)" }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${score * 100}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {contradictions.length > 0 && (
        <>
          <Divider />
          <div className="px-4 py-3">
            <p className="mb-2 text-sm font-semibold">Contradictions Detected</p>
            <ul className="list-disc pl-5 text-sm">
              {contradictions.map((item) => (
                <li
                  key={item}
                  className="break-words leading-relaxed"
                  style={{ color: "var(--red)" }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {coverage_gaps.length > 0 && (
        <>
          <Divider />
          <div className="px-4 py-3">
            <p className="mb-2 text-sm font-semibold">Coverage Gaps</p>
            <ul className="list-disc pl-5 text-sm">
              {coverage_gaps.map((item) => (
                <li
                  key={item}
                  className="break-words leading-relaxed"
                  style={{ color: "var(--gold)" }}
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {human_review_required && (
        <>
          <Divider />
          <div className="px-4 py-3">
            <p className="text-sm" style={{ color: "var(--gold)" }}>
              ⚠ Human review required for this reliance level
            </p>
          </div>
        </>
      )}
    </div>
  );
}
