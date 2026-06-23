"use client";

import { useState } from "react";

export default function Footer() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  return (
    <footer
      style={{ backgroundColor: "var(--navy)", color: "var(--white)" }}
      className="w-full"
    >
      {/* Legal disclaimer panel */}
      {showDisclaimer && (
        <div
          style={{
            backgroundColor: "var(--navy)",
            borderTop: "1px solid rgba(255,255,255,0.15)",
            borderBottom: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div className="mx-auto max-w-[900px] px-6 py-5 text-[0.78rem] leading-relaxed opacity-90">
            <p className="mb-3 font-semibold tracking-wide" style={{ fontSize: "0.82rem" }}>
              Legal Notice &amp; Research Disclaimer
            </p>
            <p className="mb-2">
              CR-Lite is a research demonstration tool developed and operated by{" "}
              <strong>EM Foundation for AI Research Inc.</strong>, a Texas nonprofit
              corporation. All content, methodology, scoring logic, and intellectual
              property associated with the Continuity Receipts (CR) standard and
              CR-Lite implementation are the exclusive property of EM Foundation for
              AI Research Inc. All rights reserved.
            </p>
            <p className="mb-2">
              <strong>For research and educational use only.</strong> Outputs generated
              by CR-Lite are produced by artificial intelligence and are provided solely
              to demonstrate the CR standard&apos;s confidence scoring and traceability
              methodology. No output constitutes legal, medical, financial, regulatory,
              or professional advice of any kind. EM Foundation expressly disclaims all
              liability for any reliance placed on CR-Lite outputs outside of research
              and educational contexts.
            </p>
            <p className="mb-2">
              Reliance Category (RC) levels are research classifications developed by
              EM Foundation. They do not constitute a warranty, guarantee, or
              certification of accuracy. Users are solely responsible for independently
              verifying any information before acting upon it, particularly at RC-3
              through RC-5 levels.
            </p>
            <p className="mb-2">
              CR-Lite uses the Anthropic Claude API. AI responses are non-deterministic
              and may vary. EM Foundation makes no representation that responses are
              complete, current, or free from error. The Foundation is not responsible
              for third-party service availability, API performance, or changes to
              underlying model behavior.
            </p>
            <p>
              Use of this tool constitutes acceptance of these terms. For research
              inquiries, licensing, or permissions, contact EM Foundation at{" "}
              <a
                href="https://emfoundation.net"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "rgba(255,255,255,0.75)", textDecoration: "underline" }}
              >
                emfoundation.net
              </a>
              .
            </p>
          </div>
        </div>
      )}

      {/* Footer bar */}
      <div className="mx-auto max-w-[900px] px-6 py-4 text-center text-[0.8rem] opacity-90">
        <span>
          © {new Date().getFullYear()} EM Foundation for AI Research Inc. · Continuity
          Receipts Open Standard · All Rights Reserved
        </span>
        <span className="mx-3 opacity-40">|</span>
        <button
          type="button"
          onClick={() => setShowDisclaimer((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.75)",
            cursor: "pointer",
            fontSize: "0.8rem",
            textDecoration: "underline",
            padding: 0,
          }}
        >
          {showDisclaimer ? "Hide Legal Notice" : "Legal Notice & Disclaimer"}
        </button>
        <span className="mx-3 opacity-40">|</span>
        <a
          href="https://emfoundation.net"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "rgba(255,255,255,0.75)", textDecoration: "underline" }}
        >
          emfoundation.net
        </a>
      </div>
    </footer>
  );
}
