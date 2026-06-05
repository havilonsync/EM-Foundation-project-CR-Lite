"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function ReceiptDetailPage() {
  const params = useParams();
  const receiptId = params.id as string;

  const [receipt, setReceipt] = useState<ContinuityReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReceipt() {
      setLoading(true);
      setNotFound(false);
      setError(null);

      try {
        const res = await fetch(apiUrl(`/api/receipts/${receiptId}`));

        if (res.status === 404) {
          setNotFound(true);
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          setError(data.detail ?? "Failed to load receipt");
          return;
        }

        setReceipt(data as ContinuityReceipt);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load receipt");
      } finally {
        setLoading(false);
      }
    }

    if (receiptId) {
      loadReceipt();
    }
  }, [receiptId]);

  const answer = receipt ? getReceiptAnswer(receipt) : null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/receipts"
        className="text-sm font-semibold no-underline hover:underline"
      >
        ← Back to Receipts
      </Link>

      {loading && (
        <p className="text-sm" style={{ color: "var(--stone)" }}>
          Loading receipt...
        </p>
      )}

      {notFound && (
        <p className="text-sm" style={{ color: "var(--red)" }}>
          Receipt not found.
        </p>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}

      {receipt && (
        <>
          <h1 className="text-3xl font-semibold">Receipt Detail</h1>

          <div
            className="p-4 text-sm leading-relaxed"
            style={{ backgroundColor: "var(--light-blue)" }}
          >
            <p className="mb-1 font-semibold">Query</p>
            <p>{receipt.query_text}</p>
          </div>

          {receipt.status === "PASS" && answer && (
            <div
              className="border p-4"
              style={{ borderColor: "var(--rule)" }}
            >
              <h2 className="mb-2 text-sm font-semibold">Answer</h2>
              <AnswerText text={answer} />
            </div>
          )}

          <ProvenanceDiagram {...toProvenanceDiagramProps(receipt)} />

          {receipt.status === "FAILURE" ? (
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <NutritionLabel {...toNutritionLabelProps(receipt)} />
              <FailureReceipt {...toFailureReceiptProps(receipt)} />
            </div>
          ) : (
            <NutritionLabel {...toNutritionLabelProps(receipt)} />
          )}
        </>
      )}
    </div>
  );
}
