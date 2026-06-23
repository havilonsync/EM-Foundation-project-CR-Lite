"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

import QueryInterface from "@/components/QueryInterface";
import { RC_DESCRIPTIONS } from "@/lib/rc-levels";
import {
  clearToken,
  getRemainingQueries,
  getStoredToken,
  initiateCheckout,
  retrieveToken,
  storeToken,
} from "@/lib/stripe";

const QUERY_LIMIT = 10;

const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please donate again to continue.";

const SESSION_TOOLTIP =
  "Each session includes 10 queries valid for 24 hours. Your donation supports the EM Foundation's research into AI governance and rights frameworks.";

function SessionBanner({
  queriesRemaining,
  onDonate,
  donateLoading,
}: {
  queriesRemaining: number;
  onDonate: () => void;
  donateLoading: boolean;
}) {
  const isLow = queriesRemaining > 0 && queriesRemaining <= 3;
  const isExhausted = queriesRemaining === 0;

  let bannerText: string;
  let borderColor: string;
  let backgroundColor: string;
  let textColor: string;

  if (isExhausted) {
    bannerText = `⚠ ${queriesRemaining} queries remaining in this session`;
    borderColor = "var(--red)";
    backgroundColor = "#F5E8E8";
    textColor = "var(--red)";
  } else if (isLow) {
    bannerText = `⚠ ${queriesRemaining} queries remaining in this session`;
    borderColor = "var(--gold)";
    backgroundColor = "#F5F0E8";
    textColor = "var(--gold)";
  } else {
    bannerText = `✓ Session active — ${queriesRemaining} queries remaining`;
    borderColor = "var(--green)";
    backgroundColor = "#E8F5EC";
    textColor = "var(--green)";
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border px-4 py-3 text-sm font-semibold"
      style={{
        borderColor,
        backgroundColor,
        color: textColor,
        fontFamily: "var(--font-ui)",
      }}
    >
      <div className="flex items-center gap-2">
        <span>{bannerText}</span>
        <div className="group relative">
          <button
            type="button"
            aria-label="Session info"
            className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold"
            style={{
              borderColor: textColor,
              color: textColor,
              fontFamily: "var(--font-ui)",
            }}
          >
            ?
          </button>
          <div
            className="pointer-events-none absolute left-0 top-full z-10 mt-2 hidden w-64 border p-3 text-xs font-normal normal-case group-hover:block group-focus-within:block"
            style={{
              borderColor: "var(--rule)",
              backgroundColor: "var(--white)",
              color: "var(--stone)",
              fontFamily: "var(--font-ui)",
            }}
            role="tooltip"
          >
            {SESSION_TOOLTIP}
          </div>
        </div>
      </div>
      {isExhausted && (
        <button
          type="button"
          onClick={onDonate}
          disabled={donateLoading}
          className="rounded-none px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{
            backgroundColor: "var(--navy)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {donateLoading ? "Redirecting..." : "Donate again →"}
        </button>
      )}
    </div>
  );
}

function DismissibleNotice({
  children,
  onDismiss,
}: {
  children: ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 border p-4 text-sm"
      style={{
        borderColor: "var(--rule)",
        backgroundColor: "var(--white)",
        color: "var(--stone)",
        fontFamily: "var(--font-ui)",
      }}
    >
      <div className="flex flex-col gap-1">{children}</div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 text-lg leading-none"
        style={{ color: "var(--stone)", fontFamily: "var(--font-ui)" }}
      >
        ×
      </button>
    </div>
  );
}

export default function Home() {
  const [hasValidToken, setHasValidToken] = useState(false);
  const [queriesRemaining, setQueriesRemaining] = useState(QUERY_LIMIT);
  const [gateMessage, setGateMessage] = useState<string | null>(null);
  const [showPaymentCancelled, setShowPaymentCancelled] = useState(false);
  const [donateError, setDonateError] = useState<string | null>(null);
  const [donateLoading, setDonateLoading] = useState(false);
  const [verifyingDonation, setVerifyingDonation] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const refreshSessionState = useCallback(() => {
    if (getStoredToken()) {
      setHasValidToken(true);
      setQueriesRemaining(getRemainingQueries());
      return;
    }

    clearToken();
    setHasValidToken(false);
    setQueriesRemaining(QUERY_LIMIT);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const sessionId = params.get("session_id");

    if (payment === "success" && sessionId) {
      let cancelled = false;

      const verifyPayment = async () => {
        setVerifyingDonation(true);
        setVerifyError(null);

        try {
          if (cancelled) return;

          const result = await retrieveToken(sessionId);
          if (cancelled) return;

          storeToken(result.token, result.expires_at);
          params.delete("payment");
          params.delete("session_id");
          const nextSearch = params.toString();
          const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
          window.history.replaceState({}, "", nextUrl);
          setGateMessage(null);
          setHasValidToken(true);
          setQueriesRemaining(getRemainingQueries());
        } catch (err) {
          if (cancelled) return;
          setVerifyError(
            err instanceof Error
              ? err.message
              : "Unable to verify your donation.",
          );
        } finally {
          if (!cancelled) {
            setVerifyingDonation(false);
          }
        }
      };

      verifyPayment();

      return () => {
        cancelled = true;
      };
    }

    if (payment === "cancelled") {
      setShowPaymentCancelled(true);
      params.delete("payment");
      const nextSearch = params.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`;
      window.history.replaceState({}, "", nextUrl);
    }

    refreshSessionState();
  }, [refreshSessionState]);

  async function handleDonate() {
    setGateMessage(null);
    setDonateError(null);
    setDonateLoading(true);

    try {
      await initiateCheckout();
    } catch (err) {
      setDonateError(
        err instanceof Error ? err.message : "Unable to start checkout.",
      );
    } finally {
      setDonateLoading(false);
    }
  }

  if (verifyingDonation) {
    return (
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center"
        style={{ fontFamily: "var(--font-ui)", color: "var(--stone)" }}
      >
        <span
          className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
        <p className="text-lg font-semibold">Verifying your donation...</p>
      </div>
    );
  }

  if (hasValidToken) {
    return (
      <div className="flex flex-col gap-6">
        <SessionBanner
          queriesRemaining={queriesRemaining}
          onDonate={handleDonate}
          donateLoading={donateLoading}
        />

        <QueryInterface
          onQuerySuccess={() => setQueriesRemaining(getRemainingQueries())}
          onSessionInvalid={() => {
            setGateMessage(SESSION_EXPIRED_MESSAGE);
            setHasValidToken(false);
            setQueriesRemaining(QUERY_LIMIT);
          }}
          onLimitReached={() => setQueriesRemaining(0)}
          onDonate={handleDonate}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {showPaymentCancelled && (
        <DismissibleNotice onDismiss={() => setShowPaymentCancelled(false)}>
          <p>No payment was processed.</p>
          <p>Access CR-Lite by supporting the Foundation.</p>
        </DismissibleNotice>
      )}
      <section className="flex flex-col gap-3">
        <h1
          className="text-5xl font-bold leading-tight"
          style={{ color: "var(--navy)", fontFamily: "var(--font-heading)" }}
        >
          CR-Lite
        </h1>
        <p className="max-w-2xl text-lg" style={{ color: "var(--stone)" }}>
          A working demonstration of the Continuity Receipts open standard
        </p>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">What is CR-Lite?</h2>
          <p style={{ color: "var(--stone)" }}>
            CR-Lite is a working demonstration of the EM Foundation&apos;s
            Continuity Receipts (CR) open standard. It shows how an AI system
            can answer a question, score its own confidence across five
            dimensions, evaluate those scores against a chosen reliance level,
            and persist every outcome as a cryptographically chained receipt.
          </p>
          <p style={{ color: "var(--stone)" }}>
            Every receipt is cryptographically chained to the previous one,
            creating an auditable provenance trail. A PASS receipt includes the
            answer; a FAILURE receipt withholds the answer and documents exactly
            which thresholds were not met.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">Reliance Levels</h2>
          <table
            className="w-full border-collapse text-sm"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            <thead>
              <tr>
                <th
                  className="border px-3 py-2 text-left font-semibold"
                  style={{ borderColor: "var(--rule)" }}
                >
                  Level
                </th>
                <th
                  className="border px-3 py-2 text-left font-semibold"
                  style={{ borderColor: "var(--rule)" }}
                >
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {RC_DESCRIPTIONS.map(({ level, useCase }) => (
                <tr key={level}>
                  <td
                    className="border px-3 py-2 font-semibold"
                    style={{ borderColor: "var(--rule)" }}
                  >
                    {level}
                  </td>
                  <td
                    className="border px-3 py-2"
                    style={{ borderColor: "var(--rule)" }}
                  >
                    {useCase}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="flex aspect-video w-full items-center justify-center border p-6 text-center text-sm"
        style={{
          backgroundColor: "var(--light-blue)",
          borderColor: "var(--rule)",
          color: "var(--stone)",
          fontFamily: "var(--font-ui)",
        }}
      >
        Video embed — Loom link to be provided by EM Foundation
      </section>

      <section
        className="receipt-gold-border p-5 text-sm leading-relaxed"
        style={{ color: "var(--stone)" }}
      >
        Each research session costs the Foundation approximately $0.25 in AI
        compute. Your suggested donation of $5 keeps this tool available for
        researchers worldwide.
      </section>

      <section className="flex flex-col gap-4">
        {gateMessage && (
          <div
            className="border p-4 text-sm"
            style={{
              borderColor: "var(--red)",
              backgroundColor: "#F5E8E8",
              color: "var(--red)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {gateMessage}
          </div>
        )}

        <div className={gateMessage ? "receipt-gold-border p-1" : undefined}>
          <button
            type="button"
            onClick={handleDonate}
            disabled={donateLoading}
            className="inline-flex w-full items-center justify-center rounded-none px-6 py-3 text-base font-semibold text-white disabled:opacity-50"
            style={{
              backgroundColor: "var(--navy)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {donateLoading
              ? "Redirecting to checkout..."
              : "Support the Foundation to Access CR-Lite →"}
          </button>
        </div>

        {(donateError || verifyError) && (
          <p className="text-sm" style={{ color: "var(--red)" }}>
            {donateError || verifyError}
          </p>
        )}

        <p className="text-sm" style={{ color: "var(--stone)" }}>
          Learn more at{" "}
          <a
            href="https://emfoundation.net"
            target="_blank"
            rel="noopener noreferrer"
          >
            emfoundation.net
          </a>
        </p>
      </section>
    </div>
  );
}
