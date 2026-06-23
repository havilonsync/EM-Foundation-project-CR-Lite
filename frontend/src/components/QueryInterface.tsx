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
import {
  clearToken,
  getStoredToken,
  incrementLocalQueryCount,
} from "@/lib/stripe";

const UNAVAILABLE_MESSAGE =
  "The service is temporarily unavailable. Please try again in a moment.";

type QueryInterfaceProps = {
  onQuerySuccess?: () => void;
  onSessionInvalid?: () => void;
  onLimitReached?: () => void;
  onDonate?: () => void;
};

export default function QueryInterface({
  onQuerySuccess,
  onSessionInvalid,
  onLimitReached,
  onDonate,
}: QueryInterfaceProps) {
  const [query, setQuery] = useState("");
  const [relianceLevel, setRelianceLevel] = useState<RelianceLevel>("RC-3");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ContinuityReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  function invalidateSession() {
    clearToken();
    onSessionInvalid?.();
  }

  async function handleSubmit() {
    const token = getStoredToken();
    if (!token) {
      invalidateSession();
      return;
    }

    setLoading(true);
    setError(null);
    setLimitReached(false);

    try {
      const res = await fetch(apiUrl("/api/query"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, reliance_level: relianceLevel }),
      });

      const data = await res.json();

      if (res.status === 401) {
        invalidateSession();
        return;
      }

      if (res.status === 429) {
        setLimitReached(true);
        onLimitReached?.();
        return;
      }

      if (res.status === 503) {
        setError(UNAVAILABLE_MESSAGE);
        return;
      }

      if (!res.ok) {
        setError(data.detail ?? "Request failed");
        return;
      }

      incrementLocalQueryCount();
      onQuerySuccess?.();
      setReceipt(data as ContinuityReceipt);
    } catch {
      setError(UNAVAILABLE_MESSAGE);
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
        disabled={limitReached}
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
              disabled={limitReached}
              className="rounded-none border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{
                borderColor: color,
                backgroundColor: selected ? color : "transparent",
                color: selected ? "var(--white)" : color,
                fontFamily: "var(--font-ui)",
              }}
            >
              {level}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !query.trim() || limitReached}
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

      {limitReached && (
        <div
          className="flex flex-col gap-4 border p-4 text-sm"
          style={{
            borderColor: "var(--gold)",
            color: "var(--gold)",
            backgroundColor: "#F5F0E8",
          }}
        >
          <p>You have used all 10 queries in this session.</p>
          <p>Support the Foundation again to continue research.</p>
          {onDonate && (
            <button
              type="button"
              onClick={onDonate}
              className="inline-flex w-full items-center justify-center rounded-none px-6 py-3 text-base font-semibold text-white"
              style={{
                backgroundColor: "var(--navy)",
                fontFamily: "var(--font-ui)",
              }}
            >
              Support the Foundation to Access CR-Lite →
            </button>
          )}
        </div>
      )}

      {error && !limitReached && (
        <div
          className="flex flex-col gap-4 border p-4 text-sm"
          style={{
            borderColor: "var(--red)",
            color: "var(--red)",
            backgroundColor: "#F5E8E8",
          }}
        >
          <p>{error}</p>
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
