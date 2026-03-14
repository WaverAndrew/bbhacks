"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { POLYMARKET_MARKET_ID } from "@/config/polymarket";
import { api } from "@/lib/api";
import type { Policy } from "@/lib/types";

export default function ExporterPage() {
  const [wallet, setWallet] = useState("");
  const [voyageId, setVoyageId] = useState("");
  const [routeName, setRouteName] = useState("");
  const [insuredAmount, setInsuredAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quote, setQuote] = useState<{ premium: string; source?: string } | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [nftId, setNftId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) return;
    api.coverage.policies(wallet)
      .then((d: any) => setPolicies(d.policies ?? []))
      .catch(() => setPolicies([]));
  }, [wallet, txHash]);

  const getQuote = async () => {
    if (!insuredAmount) return;
    setError(null);
    try {
      const d = await api.coverage.quote({
        insuredAmount,
        startDate: startDate || new Date().toISOString().slice(0, 10),
        endDate: endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        ...(POLYMARKET_MARKET_ID ? { marketId: POLYMARKET_MARKET_ID } : {}),
      });
      setQuote(d as { premium: string; source?: string });
    } catch (e: any) {
      setError(e?.message ?? "Quote failed");
    }
  };

  const bindCoverage = async () => {
    if (!wallet || !voyageId || !quote?.premium) return;
    setLoading(true); setError(null); setTxHash(null); setNftId(null); setMessage(null);
    try {
      const d: any = await api.coverage.bind({
        voyageId,
        routeName: routeName || voyageId,
        insuredAmount: insuredAmount || "0",
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || new Date().toISOString(),
        premiumAmount: quote.premium,
        ownerAddress: wallet,
      });
      setTxHash(d.txHash ?? null);
      setNftId(d.nftId ?? null);
      setMessage(d.message ?? "Coverage bound.");
      setQuote(null); setVoyageId(""); setRouteName(""); setInsuredAmount("");
    } catch (e: any) { setError(e?.message ?? "Bind failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="palantir-grid min-h-screen">
      <header className="flex items-center justify-between border-b border-panel-border bg-panel/80 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn btn-cyan text-[10px]">&larr; Command Center</Link>
          <div>
            <h1 className="font-mono text-sm font-bold tracking-wider" style={{ color: "var(--accent-green)" }}>
              EXPORTER / SHIPOWNER
            </h1>
            <p className="text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>
              Purchase parametric voyage coverage · Coverage NFT minted on XRPL
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-4 p-6">
        {/* Wallet */}
        <div className="panel p-4">
          <div className="panel-header -mx-4 -mt-4 mb-3 px-4 py-2">Wallet Connection</div>
          <input
            type="text" value={wallet} onChange={(e) => setWallet(e.target.value)}
            placeholder="rXXXX... (your XRPL wallet address)" className="input-dark w-full"
          />
        </div>

        {/* New Coverage */}
        <div className="panel p-4 glow-green">
          <div className="panel-header -mx-4 -mt-4 mb-3 px-4 py-2">New Coverage Request</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Voyage ID</label>
              <input type="text" value={voyageId} onChange={(e) => setVoyageId(e.target.value)}
                placeholder="V-HMZ-001" className="input-dark mt-1 w-full" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Route Name</label>
              <input type="text" value={routeName} onChange={(e) => setRouteName(e.target.value)}
                placeholder="Hormuz — Mumbai" className="input-dark mt-1 w-full" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Insured Amount (RLUSD)</label>
              <input type="text" value={insuredAmount} onChange={(e) => setInsuredAmount(e.target.value)}
                placeholder="50000" className="input-dark mt-1 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Start</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="input-dark mt-1 w-full" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>End</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="input-dark mt-1 w-full" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button onClick={getQuote} className="btn btn-cyan">Get Quote</button>
            {quote && (
              <>
                <span className="font-mono text-sm" style={{ color: "var(--accent-amber)" }}>
                  Premium: <strong>{quote.premium} RLUSD</strong>
                  {quote.source && quote.source !== "default" && (
                    <span className="ml-1 text-[10px] opacity-80">({quote.source})</span>
                  )}
                </span>
                <button onClick={bindCoverage} disabled={loading || !wallet || !voyageId}
                  className="btn btn-green">{loading ? "..." : "Confirm & Mint NFT"}</button>
              </>
            )}
          </div>
        </div>

        {/* Result */}
        {(error || txHash || message) && (
          <div className={`panel p-4 ${error ? "glow-red" : "glow-green"}`}>
            {error && <p style={{ color: "var(--accent-red)" }} className="text-xs">{error}</p>}
            {message && <p className="text-xs" style={{ color: "var(--accent-green)" }}>{message}</p>}
            {txHash && (
              <div className="mt-2">
                <span className="text-[10px] uppercase" style={{ color: "rgba(200,214,229,0.35)" }}>Tx Hash: </span>
                <code className="data-readout break-all">{txHash}</code>
              </div>
            )}
            {nftId && (
              <div className="mt-1">
                <span className="text-[10px] uppercase" style={{ color: "rgba(200,214,229,0.35)" }}>NFT ID: </span>
                <code className="data-readout break-all">{nftId}</code>
              </div>
            )}
          </div>
        )}

        {/* Policies */}
        <div className="panel">
          <div className="panel-header">Your Policies</div>
          {policies.length === 0 ? (
            <div className="p-4 text-center text-[11px]" style={{ color: "rgba(200,214,229,0.25)" }}>
              No policies found. Enter your wallet address and purchase coverage.
            </div>
          ) : (
            <div className="divide-y divide-panel-border">
              {policies.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="font-mono text-xs font-bold" style={{ color: "var(--accent-cyan)" }}>
                      {p.voyage_id}
                    </span>
                    <span className="ml-2 text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
                      Premium: {p.premium_amount} RLUSD
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${p.status === "active" ? "badge-active" : p.status === "claim_paid" ? "badge-incident" : "badge-expired"}`}>
                      {p.status}
                    </span>
                    {p.nft_id && (
                      <code className="text-[9px] font-mono" style={{ color: "rgba(0,212,255,0.5)" }}>
                        {p.nft_id.slice(0, 12)}...
                      </code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
