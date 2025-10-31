"use client";

import { useEffect, useState } from "react";

type SearchResult = {
  query: string;
  normalized: string;
  type: "ticker" | "company";
  suggestions: string[];
};

type Signal = {
  symbol: string;
  action: "BUY" | "SELL" | "HOLD";
  score: number;
  reasons: string[];
};

type LuckyResponse = {
  picks: Signal[];
  note: string;
};

export default function Home() {
  const base = process.env.NEXT_PUBLIC_API_BASE;
  const [status, setStatus] = useState<null | string>(null);
  const [error, setError] = useState<null | string>(null);

  const [q, setQ] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);

  const [signal, setSignal] = useState<Signal | null>(null);
  const [lucky, setLucky] = useState<LuckyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<{ server_time?: string; version?: string }>({});

  // --- Health check ---
  useEffect(() => {
    if (!base) {
      setError("Missing NEXT_PUBLIC_API_BASE. Set it in Vercel → Settings → Environment Variables.");
      return;
    }

    const checkHealth = async () => {
      try {
        const r = await fetch(`${base}/health`, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setStatus(data.status || "unknown");
        setMeta({ server_time: data.server_time, version: data.version });
      } catch (e) {
        console.error("Health check failed:", e);
        setError("Unable to reach API.");
      }
    };

    checkHealth();
  }, [base]);

  // --- Validation ---
  const validateQuery = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return "Query cannot be empty.";
    if (trimmed.length > 50) return "Query too long.";
    if (!/^[a-zA-Z0-9 .-]+$/.test(trimmed))
      return "Query contains invalid characters.";
    return null;
  };

  // --- API functions ---
  const performSearch = async (query: string) => {
    setResult(null);
    setSignal(null);
    setLucky(null);
    setError(null);
    try {
      const r = await fetch(`${base}/search?q=${encodeURIComponent(query)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as SearchResult;
      setResult(data);
    } catch (err) {
      console.error("Search error:", err);
      setError("Search failed. Please try again.");
    }
  };

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateQuery(q);
    if (validationError) {
      setError(validationError);
      return;
    }
    await performSearch(q);
  }

  async function getSignal() {
    if (!result) return;
    setLoading(true);
    setSignal(null);
    setLucky(null);
    setError(null);
    const sym =
      result.type === "ticker"
        ? result.normalized
        : result.suggestions?.[0] || result.normalized;
    try {
      const r = await fetch(`${base}/signal/${encodeURIComponent(sym)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as Signal;
      setSignal(data);
    } catch (e) {
      console.error("Signal error:", e);
      setError("Failed to fetch signal.");
    } finally {
      setLoading(false);
    }
  }

  async function feelingLucky() {
    setLoading(true);
    setSignal(null);
    setLucky(null);
    setError(null);
    try {
      const r = await fetch(`${base}/lucky`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as LuckyResponse;
      setLucky(data);
    } catch (e) {
      console.error("Lucky error:", e);
      setError("Failed to fetch lucky picks.");
    } finally {
      setLoading(false);
    }
  }

  // --- UI ---
  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">In One We Trust</h1>
      <p className="mt-2 text-sm text-gray-500">Search + Signals demo</p>

      <div className="mt-4 rounded-lg border p-4">
        <div className="font-mono">
          API:{" "}
          <span className="font-semibold">
            {base ?? "(not configured)"}
          </span>
        </div>
        <div className="mt-2">
          {status && (
            <span className="inline-block rounded bg-green-100 px-2 py-1 text-green-800">
              Health: {status}
            </span>
          )}
          {error && (
            <span className="inline-block rounded bg-red-100 px-2 py-1 text-red-800">
              Error: {error}
            </span>
          )}
          {!status && !error && <span>Checking…</span>}
        </div>
        {meta.server_time && (
          <div className="mt-1 text-xs text-gray-500">
            Server time: {meta.server_time} • API v{meta.version}
          </div>
        )}
      </div>

      <form onSubmit={onSearch} className="mt-8 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value.toUpperCase())}
          placeholder="Search ticker or company (e.g., AAPL, Tesla)…"
          className="flex-1 rounded-lg border px-3 py-2"
          aria-label="Search query"
        />
        <button
          type="submit"
          className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      {/* existing results and lucky picks rendering go here */}
    </main>
  );
}
