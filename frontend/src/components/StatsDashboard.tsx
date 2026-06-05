"use client";

import { useCallback, useEffect, useState } from "react";

import { apiUrl } from "@/lib/api";
import {
  type StatsResponse,
  formatAggregatePercent,
  formatDimensionName,
} from "@/lib/receipt";
import { RC_LEVELS } from "@/lib/rc-levels";

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

type StatsDashboardProps = {
  compact?: boolean;
};

export default function StatsDashboard({ compact = false }: StatsDashboardProps) {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/stats"));
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Failed to load stats");
        return;
      }

      setStats(data as StatsResponse);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60_000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const rcStatsByLevel = new Map(
    (stats?.by_reliance_level ?? []).map((entry) => [entry.level, entry]),
  );

  const textSize = compact ? "text-xs" : "text-sm";
  const headingSize = compact ? "text-base" : "text-3xl";
  const labelSize = compact ? "text-[0.65rem]" : "text-xs";
  const metricSize = compact ? "text-2xl" : "text-3xl";
  const gap = compact ? "gap-3" : "gap-6";
  const cardGap = compact ? "gap-2" : "gap-4";
  const cardPadding = compact ? "p-2" : "p-4";
  const tablePadding = compact ? "px-2 py-1" : "px-3 py-2";
  const footerSize = compact ? "text-[0.65rem]" : "text-xs";

  return (
    <div
      className={`flex w-full flex-col ${gap} ${textSize} ${compact ? "h-full" : ""}`}
      style={{ fontFamily: "var(--font-ui)", color: "var(--stone)" }}
    >
      <h1
        className={`${headingSize} font-semibold`}
        style={{ color: "var(--navy)" }}
      >
        CR-Lite Stats
      </h1>

      {error && (
        <p className={textSize} style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}

      {stats && (
        <>
          <div className={`grid grid-cols-3 ${cardGap}`}>
            <div
              className={`border ${cardPadding}`}
              style={{
                borderColor: "var(--rule)",
                backgroundColor: "var(--white)",
              }}
            >
              <p className={`${labelSize} uppercase tracking-wide`}>
                Total Receipts
              </p>
              <p
                className={`${metricSize} font-bold`}
                style={{ color: "var(--navy)" }}
              >
                {stats.total}
              </p>
            </div>
            <div
              className={`border ${cardPadding}`}
              style={{
                borderColor: "var(--rule)",
                backgroundColor: "var(--white)",
              }}
            >
              <p className={`${labelSize} uppercase tracking-wide`}>
                Pass Rate
              </p>
              <p
                className={`${metricSize} font-bold`}
                style={{ color: "var(--green)" }}
              >
                {formatRate(stats.pass_rate)}
              </p>
            </div>
            <div
              className={`border ${cardPadding}`}
              style={{
                borderColor: "var(--rule)",
                backgroundColor: "var(--white)",
              }}
            >
              <p className={`${labelSize} uppercase tracking-wide`}>
                Failure Rate
              </p>
              <p
                className={`${metricSize} font-bold`}
                style={{ color: "var(--red)" }}
              >
                {formatRate(stats.failure_rate)}
              </p>
            </div>
          </div>

          <div
            className={`grid ${cardGap} ${compact ? "grid-cols-2" : "md:grid-cols-2"}`}
          >
            <div>
              <p className="mb-2 font-semibold">By Reliance Level</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["Level", "Count", "Pass Rate"].map((heading) => (
                      <th
                        key={heading}
                        className={`border ${tablePadding} text-left font-semibold`}
                        style={{ borderColor: "var(--rule)" }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RC_LEVELS.map((level) => {
                    const entry = rcStatsByLevel.get(level);
                    return (
                      <tr key={level}>
                        <td
                          className={`border ${tablePadding}`}
                          style={{ borderColor: "var(--rule)" }}
                        >
                          {level}
                        </td>
                        <td
                          className={`border ${tablePadding}`}
                          style={{ borderColor: "var(--rule)" }}
                        >
                          {entry?.count ?? 0}
                        </td>
                        <td
                          className={`border ${tablePadding}`}
                          style={{ borderColor: "var(--rule)" }}
                        >
                          {formatRate(entry?.pass_rate ?? 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <p className="mb-2 font-semibold">Avg Confidence</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["Dimension", "Average"].map((heading) => (
                      <th
                        key={heading}
                        className={`border ${tablePadding} text-left font-semibold`}
                        style={{ borderColor: "var(--rule)" }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.avg_confidence).map(([key, value]) => (
                    <tr key={key}>
                      <td
                        className={`border ${tablePadding}`}
                        style={{ borderColor: "var(--rule)" }}
                      >
                        {formatDimensionName(key)}
                      </td>
                      <td
                        className={`border ${tablePadding}`}
                        style={{ borderColor: "var(--rule)" }}
                      >
                        {formatAggregatePercent(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <p className={`${footerSize} opacity-80 ${compact ? "mt-auto" : ""}`}>
        Auto-refreshes every 60 seconds
      </p>
    </div>
  );
}
