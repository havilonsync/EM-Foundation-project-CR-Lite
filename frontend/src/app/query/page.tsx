"use client";

import { useState } from "react";

import { apiUrl } from "@/lib/api";

const RC_LEVELS = ["RC-1", "RC-2", "RC-3", "RC-4", "RC-5"];

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const [relianceLevel, setRelianceLevel] = useState("RC-3");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch(apiUrl("/api/query"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, reliance_level: relianceLevel }),
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(
        JSON.stringify(
          { error: err instanceof Error ? err.message : "Request failed" },
          null,
          2,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Query</h1>

      <textarea
        className="w-full border rounded p-3 min-h-32"
        placeholder="Enter your question..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {RC_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setRelianceLevel(level)}
            className={`px-4 py-2 border rounded ${
              relianceLevel === level
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-black"
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || !query.trim()}
        className="px-6 py-2 bg-black text-white rounded disabled:opacity-50 w-fit"
      >
        {loading ? "Loading..." : "Submit"}
      </button>

      {response && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Results</h2>
          <pre className="border rounded p-4 overflow-auto text-sm bg-gray-50">
            {response}
          </pre>
        </div>
      )}
    </div>
  );
}
