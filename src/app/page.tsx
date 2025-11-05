"use client";

import { useEffect, useState } from "react";

type SearchResult = { query: string; normalized: string; type: "ticker"|"company"; suggestions: string[]; };
type Signal = { symbol: string; action: "BUY"|"SELL"|"HOLD"; score: number; reasons: string[]; };
type LuckyResponse = { picks: Signal[]; note: string; };

function formatUTC(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US",{ dateStyle:"medium", timeStyle:"short", timeZone:"UTC" }).format(date)+" UTC";
  } catch { return dateString; }
}

export default function Home() {
  const [status, setStatus] = useState<null | string>(null);
  const [error, setError]   = useState<null | string>(null);
  const [q, setQ]           = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [lucky, setLucky]   = useState<LuckyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta]     = useState<{server_time?: string; version?: string}>({});

  // Health (now via our own /api/health)
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    (async () => {
      try {
        const r = await fetch("/api/health", { cache: "no-store", signal: controller.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setStatus(data.status || "unknown");
        setMeta({ server_time: data.server_time, version: data.version });
      } catch (e) {
        console.error("Health check failed:", e);
        setError("Unable to reach API.");
      } finally {
        clearTimeout(t);
      }
    })();
    return () => { clearTimeout(t); controller.abort(); };
  }, []);

  function validateQuery(input: string) {
    const x = input.trim();
    if (!x) return "Query cannot be empty.";
    if (x.length > 50) return "Query too long.";
    if (!/^[A-Za-z0-9 .-]+$/.test(x)) return "Query contains invalid characters.";
    return null;
  }

  async function performSearch(query: string) {
    setResult(null); setSignal(null); setLucky(null); setError(null);
    const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as SearchResult;
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const ve = validateQuery(q);
    if (ve) { setError(ve); return; }
    try {
      setLoading(true);
      const data = await performSearch(q);
      setResult(data);
    } catch (err) {
      console.error("Search error:", err);
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function getSignal() {
    if (!result) return;
    setLoading(true); setSignal(null); setLucky(null); setError(null);
    const sym = result.type === "ticker" ? result.normalized : result.suggestions?.[0] || result.normalized;
    try {
      const r = await fetch(`/api/signal/${encodeURIComponent(sym)}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSignal(await r.json());
    } catch (e) {
      console.error("Signal error:", e);
      setError("Failed to fetch signal.");
    } finally { setLoading(false); }
  }

  async function feelingLucky() {
    setLoading(true); setSignal(null); setLucky(null); setError(null);
    try {
      const r = await fetch(`/api/lucky`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setLucky(await r.json());
    } catch (e) {
      console.error("Lucky error:", e);
      setError("Failed to fetch lucky picks.");
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">In One We Trust</h1>
      <p className="mt-2 text-sm text-gray-500">Search + Signals demo</p>

      <div className="mt-4 rounded-lg border p-4">
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
            Server time: {formatUTC(meta.server_time)} • API v{meta.version}
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
        <button type="submit" className="rounded-lg border px-4 py-2 hover:bg-gray-50 disabled:opacity-50" disabled={loading}>
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      {result && (
        <div className="mt-6 rounded-lg border p-4 space-y-3">
          <div className="text-sm text-gray-500">Search Result</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-semibold">Query:</div><div>{result.query}</div>
            <div className="font-semibold">Normalized:</div><div>{result.normalized}</div>
            <div className="font-semibold">Type:</div><div className="capitalize">{result.type}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={getSignal} className="rounded-lg border px-3 py-2 hover:bg-gray-50 disabled:opacity-50" disabled={loading}>
              {loading ? "Loading…" : "Get Signal"}
            </button>
            <button onClick={feelingLucky} className="rounded-lg border px-3 py-2 hover:bg-gray-50 disabled:opacity-50" disabled={loading}>
              {loading ? "Loading…" : "I’m Feeling Lucky"}
            </button>
          </div>
        </div>
      )}

      {signal && (
        <div className="mt-6 rounded-lg border p-4">
          <div className="text-sm text-gray-500 mb-2">Signal</div>
          <div className="text-lg font-semibold">{signal.symbol}: {signal.action} (score {signal.score})</div>
          <ul className="mt-2 list-disc list-inside text-sm">{signal.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </div>
      )}

      {lucky && (
        <div className="mt-6 rounded-lg border p-4">
          <div className="text-sm text-gray-500 mb-2">Today’s Picks (Demo)</div>
          <ul className="space-y-2">
            {lucky.picks.map((p) => (
              <li key={p.symbol} className="border rounded p-2">
                <div className="font-semibold">{p.symbol}: {p.action} (score {p.score})</div>
                <ul className="list-disc list-inside text-sm">{p.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-500">{lucky.note}</p>
        </div>
      )}
    </main>
  );
}