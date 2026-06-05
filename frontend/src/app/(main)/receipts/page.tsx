"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiUrl } from "@/lib/api";
import {
  type ContinuityReceipt,
  type ReceiptsPageResponse,
  formatAggregatePercent,
  formatReceiptDate,
  truncateText,
} from "@/lib/receipt";

const PAGE_SIZE = 20;

export default function ReceiptsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReceiptsPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReceipts() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          apiUrl(`/api/receipts?page=${page}&limit=${PAGE_SIZE}`),
        );
        const json = await res.json();

        if (!res.ok) {
          setError(json.detail ?? "Failed to load receipts");
          return;
        }

        setData(json as ReceiptsPageResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load receipts");
      } finally {
        setLoading(false);
      }
    }

    loadReceipts();
  }, [page]);

  const hasNext = data ? page * PAGE_SIZE < data.total : false;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Receipts</h1>

      {loading && (
        <p className="text-sm" style={{ color: "var(--stone)" }}>
          Loading receipts...
        </p>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--red)" }}>
          {error}
        </p>
      )}

      {!loading && data && data.total === 0 && (
        <p className="text-sm" style={{ color: "var(--stone)" }}>
          No receipts yet. Submit a query to generate the first receipt.
        </p>
      )}

      {!loading && data && data.total > 0 && (
        <>
          <div className="overflow-x-auto">
            <table
              className="w-full min-w-[720px] border-collapse text-sm"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              <thead>
                <tr>
                  {["Date", "Query", "RC Level", "Status", "Aggregate Score", "Action"].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="border px-3 py-2 text-left font-semibold"
                        style={{ borderColor: "var(--rule)" }}
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.items.map((receipt: ContinuityReceipt) => (
                  <tr key={receipt.id}>
                    <td
                      className="border px-3 py-2 whitespace-nowrap"
                      style={{ borderColor: "var(--rule)" }}
                    >
                      {formatReceiptDate(receipt.created_at)}
                    </td>
                    <td
                      className="border px-3 py-2"
                      style={{ borderColor: "var(--rule)" }}
                    >
                      {truncateText(receipt.query_text, 50)}
                    </td>
                    <td
                      className="border px-3 py-2"
                      style={{ borderColor: "var(--rule)" }}
                    >
                      {receipt.reliance_level}
                    </td>
                    <td
                      className="border px-3 py-2"
                      style={{ borderColor: "var(--rule)" }}
                    >
                      <span
                        className="inline-block px-2 py-0.5 text-xs font-semibold text-white"
                        style={{
                          backgroundColor:
                            receipt.status === "PASS"
                              ? "var(--green)"
                              : "var(--red)",
                        }}
                      >
                        {receipt.status === "PASS" ? "PASS" : "FAIL"}
                      </span>
                    </td>
                    <td
                      className="border px-3 py-2"
                      style={{ borderColor: "var(--rule)" }}
                    >
                      {formatAggregatePercent(receipt.aggregate_confidence)}
                    </td>
                    <td
                      className="border px-3 py-2"
                      style={{ borderColor: "var(--rule)" }}
                    >
                      <Link
                        href={`/receipts/${receipt.id}`}
                        className="font-semibold no-underline hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setPage((current) => current - 1)}
              disabled={page <= 1}
              className="rounded-none border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{
                borderColor: "var(--navy)",
                color: "var(--navy)",
                fontFamily: "var(--font-ui)",
              }}
            >
              Prev
            </button>
            <span className="text-sm" style={{ color: "var(--stone)" }}>
              Page {page} of {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={!hasNext}
              className="rounded-none border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{
                borderColor: "var(--navy)",
                color: "var(--navy)",
                fontFamily: "var(--font-ui)",
              }}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
