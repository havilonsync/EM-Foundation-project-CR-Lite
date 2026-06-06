"use client";

import { useState } from "react";

import AnswerText from "@/components/AnswerText";
import FailureReceipt from "@/components/FailureReceipt";
import NutritionLabel from "@/components/NutritionLabel";
import ProvenanceDiagram from "@/components/Provenancediagram";
import { apiUrl } from "@/lib/api";
import {
  type ContinuityReceipt,
  getReceiptAnswer,
  toFailureReceiptProps,
  toNutritionLabelProps,
  toProvenanceDiagramProps,
} from "@/lib/receipt";
import { RC_COLORS, RC_LEVELS, type RelianceLevel } from "@/lib/rc-levels";

const RC_LABELS: Record<string, string> = {
  "RC-1": "Brainstorm",
  "RC-2": "Research",
  "RC-3": "Professional",
  "RC-4": "Legal / Regulatory",
  "RC-5": "Medical / Safety",
};

const RC_DESCRIPTIONS: Record<string, string> = {
  "RC-1": "RC-1 · Brainstorm · Casual reference only · Minimum confidence 0.30",
  "RC-2": "RC-2 · Research assistance · Human review recommended for consequential decisions · Minimum confidence 0.50",
  "RC-3": "RC-3 · Professional use · Human review required before action · Minimum confidence 0.65",
  "RC-4": "RC-4 · Legal / Regulatory · Expert review mandatory · Minimum confidence 0.80",
  "RC-5": "RC-5 · Medical / Safety · Do not rely without qualified expert verification · Minimum confidence 0.90",
};

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const [relianceLevel, setRelianceLevel] = useState<RelianceLevel>("RC-3");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ContinuityReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setReceipt(null);
    setError(null);

    try {
      const res = await fetch(apiUrl("/api/query"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, reliance_level: relianceLevel }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail ?? "Request failed");
        return;
      }

      setReceipt(data as ContinuityReceipt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const answer = receipt ? getReceiptAnswer(receipt) : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Submit a Query</h1>

      <textarea
        className="min-h-32 w-full rounded-none border p-3"
        style={{ borderColor: "var(--rule)", fontFamily: "var(--font-ui)" }}
        placeholder="Enter your question..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {RC_LEVELS.map((level) => {
          const color = RC_COLORS[level];
          const selected = relianceLevel === level;

          return (
            <button
              key={level}
              type="button"
              onClick={() => setRelianceLevel(level)}
              className="rounded-none border px-4 py-2 font-semibold flex flex-col items-center gap-1"
              style={{
                borderColor: color,
                backgroundColor: selected ? color : "transparent",
                color: selected ? "var(--white)" : color,
                fontFamily: "var(--font-ui)",
              }}
            >
              <span style={{ fontSize: "14px" }}>{level}</span>
              <span style={{ fontSize: "10px", fontWeight: 400, opacity: 0.9 }}>
                {RC_LABELS[level]}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="text-sm p-3 border"
        style={{
          borderColor: RC_COLORS[relianceLevel],
          color: "var(--stone)",
          fontFamily: "var(--font-ui)",
          backgroundColor: RC_COLORS[relianceLevel] + "18",
        }}
      >
        {RC_DESCRIPTIONS[relianceLevel]}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !query.trim()}
        className="w-full rounded-none px-6 py-3 text-base font-semibold text-white disabled:opacity-50"
        style={{
          backgroundColor: "var(--navy)",
          fontFamily: "var(--font-ui)",
        }}
      >
        {loading ? "Generating receipt..." : "Submit Query"}
      </button>

      {loading && (
        <div
          className="flex items-center gap-3 text-sm"
          style={{ color: "var(--stone)", fontFamily: "var(--font-ui)" }}
        >
          <span
            className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent"
            aria-hidden="true"
          />
          Generating receipt...
        </div>
      )}

      {error && (
        <div
          className="border p-4 text-sm"
          style={{
            borderColor: "var(--red)",
            color: "var(--red)",
            backgroundColor: "#F5E8E8",
          }}
        >
          {error}
        </div>
      )}

      {receipt && (
        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold">Receipt Result</h2>

          {receipt.status === "PASS" ? (
            <>
              {answer && (
                <div className="receipt-gold-border p-4">
                  <h3 className="mb-2 text-sm font-semibold">Answer</h3>
                  <AnswerText text={answer} />
                </div>
              )}
              <ProvenanceDiagram {...toProvenanceDiagramProps(receipt)} />
              <NutritionLabel {...toNutritionLabelProps(receipt)} />
            </>
          ) : (
            <>
              <ProvenanceDiagram {...toProvenanceDiagramProps(receipt)} />
              <div className="grid items-start gap-6 lg:grid-cols-2">
                <NutritionLabel {...toNutritionLabelProps(receipt)} />
                <FailureReceipt {...toFailureReceiptProps(receipt)} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
