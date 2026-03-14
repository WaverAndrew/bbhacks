"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Voyage } from "@/lib/types";

export default function AdminPage() {
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    message?: string;
    payoutTxHash?: string;
    burnTxHash?: string;
    paidTo?: string;
    amount?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchVoyages = () => {
    api.oracle.voyages()
      .then((d: any) => setVoyages(d.voyages ?? []))
      .catch(() => setVoyages([]));
  };

  useEffect(() => { fetchVoyages(); }, []);

  const trigger = (incident: boolean) => async () => {
    if (!selectedId) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const d = incident
        ? await api.oracle.incident(selectedId)
        : await api.oracle.noIncident(selectedId);
      setResult(d as any);
      fetchVoyages();
    } catch (e: any) { setError(e?.message ?? "Request failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="palantir-grid min-h-screen">
      <header className="flex items-center justify-between border-b border-panel-border bg-panel/80 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn btn-cyan text-[10px]">&larr; Command Center</Link>
          <div>
            <h1 className="font-mono text-sm font-bold tracking-wider" style={{ color: "var(--accent-amber)" }}>
              ORACLE / ADMIN
            </h1>
            <p className="text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>
              Incident simulation · Trigger on-ledger payouts and NFT burns
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-4 p-6">
        {/* Voyages Table */}
        <div className="panel">
          <div className="panel-header">Voyages Registry</div>
          {voyages.length === 0 ? (
            <div className="p-4 text-center text-[11px]" style={{ color: "rgba(200,214,229,0.25)" }}>
              No voyages registered. Create coverage from the Exporter page first.
            </div>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-panel-border text-left" style={{ color: "rgba(200,214,229,0.35)" }}>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wider">Route</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wider">Insured</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wider">Period</th>
                  <th className="px-4 py-2 font-semibold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {voyages.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => setSelectedId(v.id)}
                    className={`cursor-pointer transition hover:bg-white/[0.02] ${
                      selectedId === v.id ? "bg-accent-cyan/[0.05]" : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-mono" style={{ color: "var(--accent-cyan)" }}>{v.id}</td>
                    <td className="px-4 py-2">{v.route_name}</td>
                    <td className="px-4 py-2 font-mono">{Number(v.insured_amount).toLocaleString()}</td>
                    <td className="px-4 py-2 text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
                      {v.start_date.slice(0, 10)} — {v.end_date.slice(0, 10)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`badge ${
                        v.status === "active" ? "badge-active"
                        : v.status.includes("incident") ? "badge-incident"
                        : "badge-expired"
                      }`}>{v.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Actions */}
        <div className="panel p-4">
          <div className="panel-header -mx-4 -mt-4 mb-3 px-4 py-2">Oracle Actions</div>
          <div className="flex items-center gap-3">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="input-dark flex-1"
            >
              <option value="">Select a voyage...</option>
              {voyages.filter((v) => v.status === "active").map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {v.route_name}
                </option>
              ))}
            </select>
            <button onClick={trigger(true)} disabled={loading || !selectedId}
              className="btn btn-red">{loading ? "..." : "Mark Incident"}</button>
            <button onClick={trigger(false)} disabled={loading || !selectedId}
              className="btn btn-amber">{loading ? "..." : "No Incident"}</button>
          </div>
        </div>

        {/* Result */}
        {(error || result) && (
          <div className={`panel p-4 ${error ? "glow-red" : result?.payoutTxHash ? "glow-red" : "glow-green"}`}>
            {error && <p style={{ color: "var(--accent-red)" }} className="text-xs">{error}</p>}
            {result && (
              <div className="space-y-2">
                <p className="text-xs" style={{ color: result.payoutTxHash ? "var(--accent-red)" : "var(--accent-green)" }}>
                  {result.message}
                </p>
                {result.paidTo && (
                  <div>
                    <span className="text-[10px] uppercase" style={{ color: "rgba(200,214,229,0.35)" }}>Paid To: </span>
                    <code className="data-readout break-all">{result.paidTo}</code>
                    <span className="ml-2 font-mono text-sm font-bold" style={{ color: "var(--accent-amber)" }}>
                      {Number(result.amount).toLocaleString()} RLUSD
                    </span>
                  </div>
                )}
                {result.payoutTxHash && (
                  <div>
                    <span className="text-[10px] uppercase" style={{ color: "rgba(200,214,229,0.35)" }}>Payout Tx: </span>
                    <code className="data-readout break-all">{result.payoutTxHash}</code>
                  </div>
                )}
                {result.burnTxHash && (
                  <div>
                    <span className="text-[10px] uppercase" style={{ color: "rgba(200,214,229,0.35)" }}>Burn Tx: </span>
                    <code className="data-readout break-all">{result.burnTxHash}</code>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
