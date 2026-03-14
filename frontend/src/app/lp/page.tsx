"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { VaultData } from "@/lib/types";

export default function LpPage() {
  const [wallet, setWallet] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [vault, setVault] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    api.lp.vault(wallet)
      .then((d: any) => { if (!cancelled) setVault(d); })
      .catch(() => { if (!cancelled) setVault(null); });
    return () => { cancelled = true; };
  }, [wallet, txHash]);

  const handleDeposit = async () => {
    if (!wallet || !depositAmount) return;
    setLoading(true); setError(null); setTxHash(null);
    try {
      const d = await api.lp.deposit({ lpAddress: wallet, amount: depositAmount });
      setTxHash((d as any).txHash ?? null);
      setDepositAmount("");
    } catch (e: any) { setError(e?.message ?? "Deposit failed"); }
    finally { setLoading(false); }
  };

  const handleWithdraw = async () => {
    if (!wallet || !withdrawAmount) return;
    setLoading(true); setError(null); setTxHash(null);
    try {
      const d = await api.lp.withdraw({ lpAddress: wallet, amount: withdrawAmount });
      setTxHash((d as any).txHash ?? null);
      setWithdrawAmount("");
    } catch (e: any) { setError(e?.message ?? "Withdraw failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="palantir-grid min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-panel-border bg-panel/80 px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="btn btn-cyan text-[10px]">
            &larr; Command Center
          </Link>
          <div>
            <h1 className="font-mono text-sm font-bold tracking-wider" style={{ color: "var(--accent-cyan)" }}>
              LIQUIDITY PROVIDER
            </h1>
            <p className="text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>
              Deposit RLUSD · Receive vRLUSD share tokens · Earn from premiums
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-4 p-6">
        {/* Wallet */}
        <div className="panel p-4">
          <div className="panel-header -mx-4 -mt-4 mb-3 px-4 py-2">Wallet Connection</div>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="rXXXX... (your XRPL wallet address)"
            className="input-dark w-full"
          />
          <p className="mt-2 text-[10px]" style={{ color: "rgba(200,214,229,0.25)" }}>
            Ensure you have RLUSD trust line (RLS) and vRLUSD trust line (VRL) set up. Each trust line requires ~2 XRP reserve.
          </p>
        </div>

        {/* Metrics */}
        {vault && (
          <div className="grid grid-cols-4 gap-3">
            <div className="panel p-3">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>TVL (RLUSD)</div>
              <div className="mt-1 font-mono text-xl font-bold" style={{ color: "var(--accent-cyan)" }}>
                {Number(vault.tvl).toLocaleString()}
              </div>
            </div>
            <div className="panel p-3">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Your RLUSD</div>
              <div className="mt-1 font-mono text-xl font-bold" style={{ color: "var(--accent-green)" }}>
                {Number(vault.userRlusd).toLocaleString()}
              </div>
            </div>
            <div className="panel p-3">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Your vRLUSD</div>
              <div className="mt-1 font-mono text-xl font-bold" style={{ color: "var(--accent-amber)" }}>
                {Number(vault.userVrlusd).toLocaleString()}
              </div>
            </div>
            <div className="panel p-3">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Est. APR</div>
              <div className="mt-1 font-mono text-xl font-bold" style={{ color: "var(--foreground)" }}>
                {vault.estimatedApr || "—"}%
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Deposit */}
          <div className="panel p-4 glow-cyan">
            <div className="panel-header -mx-4 -mt-4 mb-3 px-4 py-2">Deposit RLUSD</div>
            <p className="mb-3 text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>
              Send RLUSD to the Vault from your wallet, then call deposit to mint vRLUSD.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Amount"
                className="input-dark flex-1"
              />
              <button
                onClick={handleDeposit}
                disabled={loading || !wallet || !depositAmount}
                className="btn btn-cyan"
              >
                {loading ? "..." : "Mint vRLUSD"}
              </button>
            </div>
          </div>

          {/* Withdraw */}
          <div className="panel p-4 glow-green">
            <div className="panel-header -mx-4 -mt-4 mb-3 px-4 py-2">Withdraw RLUSD</div>
            <p className="mb-3 text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>
              Burn vRLUSD to receive RLUSD back from the Vault.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="vRLUSD amount"
                className="input-dark flex-1"
              />
              <button
                onClick={handleWithdraw}
                disabled={loading || !wallet || !withdrawAmount}
                className="btn btn-green"
              >
                {loading ? "..." : "Withdraw"}
              </button>
            </div>
          </div>
        </div>

        {/* Result */}
        {(error || txHash) && (
          <div className={`panel p-4 ${error ? "glow-red" : "glow-green"}`}>
            {error && <p style={{ color: "var(--accent-red)" }} className="text-xs">{error}</p>}
            {txHash && (
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>
                  Transaction Hash
                </div>
                <code className="data-readout mt-1 block break-all">{txHash}</code>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
