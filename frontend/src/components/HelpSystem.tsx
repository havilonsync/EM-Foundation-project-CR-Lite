"use client";

import { useState } from "react";

type HelpTopic =
  | "query-input"
  | "rc-selector"
  | "rc-1"
  | "rc-2"
  | "rc-3"
  | "rc-4"
  | "rc-5"
  | "nutrition-label"
  | "provenance-diagram"
  | "failure-receipt"
  | "chain-hash"
  | "confidence-score";

interface HelpContent {
  title: string;
  what: string;
  how: string;
  why: string;
}

const HELP_CONTENT: Record<HelpTopic, HelpContent> = {
  "query-input": {
    title: "Query Input",
    what: "The text field where you enter the question or statement you want CR-Lite to evaluate.",
    how: "Type any question you would ask an AI assistant. CR-Lite forwards your query to the Claude API and then scores the response across five confidence dimensions before returning a structured receipt.",
    why: "CR-Lite's research objective is to demonstrate that AI outputs can be made traceable and auditable. The query is the starting point of that chain — every receipt is permanently linked to the exact query that produced it, creating an unbreakable audit trail.",
  },
  "rc-selector": {
    title: "Reliance Category (RC) Level",
    what: "A five-tier scale that tells CR-Lite how rigorously to evaluate the AI response based on how much you intend to rely on it.",
    how: "Select the RC level that matches your intended use. CR-Lite applies the corresponding confidence thresholds to the response. If the response scores below those thresholds, it issues a FAIL receipt. Higher RC levels require higher aggregate and per-dimension confidence scores to pass.",
    why: "A core insight of the CR standard is that not all AI use is equal. Brainstorming carries different risk than a regulatory filing. The RC system forces the user to declare their reliance intent upfront, making that intent part of the permanent receipt record — which is itself a governance mechanism.",
  },
  "rc-1": {
    title: "RC-1 · Brainstorm",
    what: "The lowest reliance tier. No minimum confidence thresholds are applied.",
    how: "Use RC-1 when you are exploring ideas, generating creative options, or asking questions where you have no intention of acting directly on the output without your own independent judgment.",
    why: "RC-1 exists to acknowledge that casual AI use is legitimate and common, but should still be documented. Even a brainstorm query generates a receipt — establishing that the output was used at exploratory intent, not as a basis for decisions.",
  },
  "rc-2": {
    title: "RC-2 · Research",
    what: "Informational use with moderate confidence requirements. Aggregate score ≥ 0.50, all dimensions ≥ 0.40.",
    how: "Use RC-2 when researching a topic where you will cross-reference the output with other sources before drawing conclusions. Human review is recommended for any consequential decisions.",
    why: "Research use sits at the boundary between casual reference and professional reliance. RC-2 sets a floor that filters out low-confidence outputs while acknowledging that a researcher applies their own critical judgment to the result.",
  },
  "rc-3": {
    title: "RC-3 · Professional",
    what: "Operational use with elevated confidence requirements. Aggregate score ≥ 0.70, all dimensions ≥ 0.60.",
    how: "Use RC-3 when the output will inform a business decision, operational process, or professional recommendation. Human expert review is required before acting on any RC-3 output.",
    why: "RC-3 is the standard threshold for professional contexts where AI is being used as an assistant rather than a reference tool. The higher thresholds reflect the real-world cost of acting on low-quality AI output in professional settings.",
  },
  "rc-4": {
    title: "RC-4 · Legal / Regulatory",
    what: "High-stakes professional use with strict confidence requirements. Aggregate score ≥ 0.85, all dimensions ≥ 0.70.",
    how: "Use RC-4 for queries touching legal interpretation, regulatory compliance, contractual analysis, or any domain where errors carry legal or financial liability. Qualified expert review is mandatory before reliance.",
    why: "Legal and regulatory domains require a very high evidence bar. RC-4 reflects the CR standard's position that AI outputs in these domains should be treated as a starting point for expert analysis, never as a final answer.",
  },
  "rc-5": {
    title: "RC-5 · Medical / Safety",
    what: "The highest reliance tier. Maximum confidence requirements. Aggregate score ≥ 0.90, all dimensions ≥ 0.80.",
    how: "Use RC-5 for queries involving medical information, physical safety, pharmaceutical guidance, or any context where an error could cause direct harm to a person. Do not rely on any RC-5 output without verification by a qualified expert.",
    why: "RC-5 exists to document high-stakes AI use transparently. The CR standard's position is that even at the highest confidence tier, human expert verification is non-negotiable for medical and safety decisions. The receipt creates an auditable record of that reliance intent.",
  },
  "nutrition-label": {
    title: "Confidence Nutrition Label",
    what: "A structured display of the five confidence dimensions CR-Lite scores for every AI response.",
    how: "CR-Lite evaluates each response across five dimensions: Factual Grounding, Source Traceability, Logical Consistency, Completeness, and Uncertainty Acknowledgment. Each dimension receives a score from 0.00 to 1.00. The aggregate score is the weighted composite.",
    why: "The Nutrition Label is the visual heart of the CR standard. Just as a food label discloses what is in a product, the Confidence Label discloses what is — and is not — verifiable about an AI response. It makes AI confidence legible to non-technical users and auditable for researchers.",
  },
  "provenance-diagram": {
    title: "Provenance Diagram",
    what: "A visual chain showing the path from your query through the AI model to the scored receipt.",
    how: "The diagram traces: your query → the AI model and version that processed it → the scoring engine → the final receipt with its chain hash. Each link in the chain is timestamped.",
    why: "Provenance is the foundation of accountability. The CR standard requires that every receipt be traceable back to its origin so that any claim made using a CR receipt can be independently audited. The provenance diagram makes that chain visually explicit.",
  },
  "failure-receipt": {
    title: "Failure Receipt",
    what: "A structured record issued when a response fails to meet the confidence thresholds required by the selected RC level.",
    how: "When one or more confidence dimensions score below the RC threshold, CR-Lite issues a FAIL receipt instead of a PASS. The failure receipt shows exactly which dimensions failed, by how much, and what the minimum required scores were.",
    why: "Failure receipts are as important as passing ones. A documented failure is not a system error — it is the system working correctly. It tells the user that the AI response did not meet the stated reliance bar, and that the user should not proceed without additional verification. This is the CR standard's core accountability mechanism.",
  },
  "chain-hash": {
    title: "Chain Hash",
    what: "A cryptographic fingerprint uniquely identifying this specific receipt and linking it to its parent receipts.",
    how: "CR-Lite generates a SHA-256 hash of the receipt content at the moment of creation. This hash is stored with the receipt and displayed on the output. Any modification to the receipt — even a single character — produces a completely different hash.",
    why: "The chain hash is what makes a continuity receipt tamper-evident. If a receipt is later used to support a claim or decision, the hash can be independently verified to confirm the receipt has not been altered since issuance. This is the 'continuity' in Continuity Receipts.",
  },
  "confidence-score": {
    title: "Aggregate Confidence Score",
    what: "A single composite score from 0.00 to 1.00 summarizing the overall confidence of the AI response across all five dimensions.",
    how: "CR-Lite calculates the aggregate as a weighted composite of the five dimension scores. The aggregate is compared against the RC level threshold to determine PASS or FAIL status.",
    why: "A single aggregate score gives users a fast signal while the individual dimension scores provide the detail needed for deeper analysis. The CR standard uses this two-level structure — aggregate for decisions, dimensions for accountability — to serve both non-technical users and researchers.",
  },
};

interface HelpButtonProps {
  topic: HelpTopic;
  className?: string;
}

export function HelpButton({ topic, className = "" }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const content = HELP_CONTENT[topic];

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        aria-label={`Help: ${content.title}`}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          border: "1.5px solid var(--stone)",
          background: "transparent",
          color: "var(--stone)",
          fontSize: "11px",
          fontWeight: 600,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
        }}
      >
        ?
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <span
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 40,
            }}
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <span
            style={{
              position: "absolute",
              left: "calc(100% + 8px)",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 50,
              width: "320px",
              backgroundColor: "white",
              border: "1px solid var(--rule)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
              padding: "16px",
              fontFamily: "var(--font-ui)",
            }}
          >
            {/* Close */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                top: "10px",
                right: "12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "16px",
                color: "var(--stone)",
                lineHeight: 1,
                padding: 0,
              }}
              aria-label="Close help"
            >
              ×
            </button>

            <p
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "var(--navy)",
                marginBottom: "12px",
                paddingRight: "20px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {content.title}
            </p>

            <HelpSection label="What" text={content.what} />
            <HelpSection label="How" text={content.how} />
            <HelpSection label="Why" text={content.why} />

            <p
              style={{
                fontSize: "0.7rem",
                color: "var(--stone)",
                marginTop: "12px",
                opacity: 0.7,
                borderTop: "1px solid var(--rule)",
                paddingTop: "8px",
              }}
            >
              EM Foundation · CR Standard Research Tool
            </p>
          </span>
        </>
      )}
    </span>
  );
}

function HelpSection({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <p
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "var(--navy)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "3px",
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: "0.78rem", color: "var(--stone)", lineHeight: 1.55 }}>
        {text}
      </p>
    </div>
  );
}
