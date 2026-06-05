type FailedDimension = {
  name: string;
  required: number;
  achieved: number;
};

export type FailureReceiptProps = {
  reliance_level: string;
  required_aggregate: number;
  achieved_aggregate: number;
  failed_dimensions: FailedDimension[];
  failure_reason: string;
  partial_available: boolean;
  partial_rc_level: string | null;
  required_action: string;
};

type ActionConfig = {
  label: string;
  color: string;
  backgroundColor: string;
  icon?: string;
};

const ACTION_CONFIG: Record<string, ActionConfig> = {
  "human-expert-review": {
    label: "Human expert review required",
    color: "var(--gold)",
    backgroundColor: "#F5F0E0",
  },
  "professional-review": {
    label: "Professional review required",
    color: "#B45309",
    backgroundColor: "#FDF4EC",
  },
  "safety-halt": {
    label: "Safety halt — do not proceed",
    color: "var(--red)",
    backgroundColor: "#F5E8E8",
    icon: "⛔",
  },
};

function formatScore(value: number): string {
  return value.toFixed(2);
}

function comparisonColor(achieved: number, required: number): string {
  return achieved >= required ? "var(--green)" : "var(--red)";
}

function getRequiredActionConfig(action: string): ActionConfig {
  if (ACTION_CONFIG[action]) {
    return ACTION_CONFIG[action];
  }

  const label = action
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    label,
    color: "var(--stone)",
    backgroundColor: "#F0EFED",
  };
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

export default function FailureReceipt({
  reliance_level,
  required_aggregate,
  achieved_aggregate,
  failed_dimensions,
  failure_reason,
  partial_available,
  partial_rc_level,
  required_action,
}: FailureReceiptProps) {
  const actionConfig = getRequiredActionConfig(required_action);

  return (
    <div
      className="mx-auto w-full max-w-lg rounded-none"
      style={{
        border: "2px solid var(--red)",
        backgroundColor: "var(--white)",
        fontFamily: "var(--font-ui)",
        color: "var(--stone)",
      }}
    >
      <div className="px-4 py-3">
        <h2
          className="text-2xl font-bold leading-tight"
          style={{ color: "var(--red)" }}
        >
          FAILURE RECEIPT
        </h2>
        <p className="mt-1 text-sm">
          This query did not meet the confidence threshold for {reliance_level}.
        </p>
      </div>

      <Divider />

      <div className="px-4 py-3">
        <p className="mb-3 text-sm font-semibold">Threshold Comparison</p>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th
                className="border px-3 py-2 text-left font-semibold"
                style={{ borderColor: "var(--rule)" }}
              />
              <th
                className="border px-3 py-2 text-left font-semibold"
                style={{ borderColor: "var(--rule)" }}
              >
                Required
              </th>
              <th
                className="border px-3 py-2 text-left font-semibold"
                style={{ borderColor: "var(--rule)" }}
              >
                Achieved
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                className="border px-3 py-2"
                style={{ borderColor: "var(--rule)" }}
              >
                Aggregate Score
              </td>
              <td
                className="border px-3 py-2"
                style={{ borderColor: "var(--rule)" }}
              >
                {formatScore(required_aggregate)}
              </td>
              <td
                className="border px-3 py-2 font-semibold"
                style={{
                  borderColor: "var(--rule)",
                  color: comparisonColor(
                    achieved_aggregate,
                    required_aggregate,
                  ),
                }}
              >
                {formatScore(achieved_aggregate)}
              </td>
            </tr>
            {failed_dimensions.map((dimension) => (
              <tr key={dimension.name}>
                <td
                  className="border px-3 py-2"
                  style={{ borderColor: "var(--rule)" }}
                >
                  {dimension.name}
                </td>
                <td
                  className="border px-3 py-2"
                  style={{ borderColor: "var(--rule)" }}
                >
                  {formatScore(dimension.required)}
                </td>
                <td
                  className="border px-3 py-2 font-semibold"
                  style={{
                    borderColor: "var(--rule)",
                    color: "var(--red)",
                  }}
                >
                  {formatScore(dimension.achieved)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Divider />

      <div className="px-4 py-3">
        <p className="mb-2 text-sm font-semibold">Failure Reason</p>
        <div
          className="p-3 text-sm leading-relaxed"
          style={{ backgroundColor: "var(--light-blue)" }}
        >
          {failure_reason}
        </div>
      </div>

      <Divider />

      <div className="px-4 py-3">
        <p className="mb-2 text-sm font-semibold">Partial Availability</p>
        {partial_available && partial_rc_level ? (
          <div
            className="border p-3 text-sm"
            style={{
              borderColor: "var(--green)",
              backgroundColor: "#E8F0EA",
              color: "var(--green)",
            }}
          >
            This query would PASS at {partial_rc_level}. Consider reducing your
            reliance level.
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--stone)" }}>
            No lower reliance level available.
          </p>
        )}
      </div>

      <Divider />

      <div className="px-4 py-3">
        <p className="mb-2 text-sm font-semibold">Required Action</p>
        <div
          className="border p-3 text-base font-semibold"
          style={{
            borderColor: actionConfig.color,
            color: actionConfig.color,
            backgroundColor: actionConfig.backgroundColor,
          }}
        >
          {actionConfig.icon && <span className="mr-1">{actionConfig.icon}</span>}
          {actionConfig.label}
        </div>
      </div>
    </div>
  );
}
