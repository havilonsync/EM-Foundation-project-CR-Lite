import Link from "next/link";

import { RC_DESCRIPTIONS } from "@/lib/rc-levels";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h1 className="text-5xl font-bold leading-tight">CR-Lite</h1>
        <p className="max-w-2xl text-lg" style={{ color: "var(--stone)" }}>
          A working demonstration of the Continuity Receipts open standard
        </p>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold">What is a Continuity Receipt?</h2>
          <p style={{ color: "var(--stone)" }}>
            A Continuity Receipt is a structured record issued whenever an AI
            system answers a query under the EM Foundation&apos;s Continuity
            Receipts (CR) standard. Each receipt documents the query, the
            confidence assessment across five dimensions, and whether the result
            met the threshold for the requested reliance level.
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
                  Threshold
                </th>
                <th
                  className="border px-3 py-2 text-left font-semibold"
                  style={{ borderColor: "var(--rule)" }}
                >
                  Use Case
                </th>
              </tr>
            </thead>
            <tbody>
              {RC_DESCRIPTIONS.map(({ level, threshold, useCase }) => (
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
                    {threshold}
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

      <section className="flex flex-col gap-4">
        <Link
          href="/query"
          className="inline-flex w-full items-center justify-center rounded-none px-6 py-3 text-base font-semibold text-white no-underline md:w-fit"
          style={{
            backgroundColor: "var(--navy)",
            fontFamily: "var(--font-ui)",
          }}
        >
          Submit a Query →
        </Link>
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
