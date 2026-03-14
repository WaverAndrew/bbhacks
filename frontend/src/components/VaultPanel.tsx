"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { VaultData, Voyage, XrplStep } from "@/lib/types";
import XrplTimeline from "./XrplTimeline";

type Props = {
  wallet: string;
  /** When set, switch to this tab (e.g. from "Deposit" on policy detail). */
  openTab?: "deposit" | "withdraw" | null;
  /** Called when user changes tab so parent can clear openTab. */
  onTabChange?: () => void;
};

export default function VaultPanel({ wallet, openTab, onTabChange }: Props) {
  const [vault, setVault] = useState<VaultData | null>(null);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [depositAmt, setDepositAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<XrplStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "deposit" | "withdraw">("overview");

  useEffect(() => {
    if (openTab === "deposit" || openTab === "withdraw") {
      setTab(openTab);
    }
  }, [openTab]);

  const refresh = () => {
    api.lp.vault(wallet).then((d: any) => setVault(d)).catch(() => {});
    api.oracle.voyages().then((d: any) => setVoyages(d.voyages ?? d ?? [])).catch(() => {});
  };

  useEffect(() => {
    if (wallet) refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [wallet]);

  const activeVoyages = voyages.filter((v) => v.status === "active");
  const totalExposure = activeVoyages.reduce((sum, v) => sum + Number(v.insured_amount), 0);
  const totalPremiums = activeVoyages.reduce((sum, v) => {
    // 2% premium per insured amount
    return sum + Number(v.insured_amount) * 0.02;
  }, 0);
  const tvl = vault ? Number(vault.tvl) : 0;
  const utilizationRate = tvl > 0 ? ((totalExposure / tvl) * 100).toFixed(1) : "0";
  const userShare = vault && Number(vault.totalVrlusd) > 0
    ? ((Number(vault.userVrlusd) / Number(vault.totalVrlusd)) * 100).toFixed(1)
    : "0";

  const handleDeposit = async () => {
    if (!wallet || !depositAmt) return;
    setLoading(true); setError(null);
    setSteps([
      { id: "tl", label: "Trust Line Check", description: "Verify vRLUSD trust line to Vault", status: "active" },
      { id: "send", label: "RLUSD Transfer", description: `Send ${depositAmt} RLUSD to Vault via XRPL Payment tx`, status: "pending" },
      { id: "mint", label: "vRLUSD Mint", description: "Vault issues share tokens to your wallet", status: "pending" },
    ]);
    await delay(600);
    setSteps((s) => s.map((x) =>
      x.id === "tl" ? { ...x, status: "complete", detail: "Trust line verified" } :
      x.id === "send" ? { ...x, status: "active" } : x
    ));
    await delay(500);
    try {
      setSteps((s) => s.map((x) =>
        x.id === "send" ? { ...x, status: "complete" } :
        x.id === "mint" ? { ...x, status: "active" } : x
      ));
      const d: any = await api.lp.deposit({ lpAddress: wallet, amount: depositAmt });
      setSteps((s) => s.map((x) =>
        x.id === "mint" ? { ...x, status: "complete", txHash: d.txHash, detail: `${depositAmt} vRLUSD minted` } : x
      ));
      setDepositAmt("");
      refresh();
    } catch (e: any) {
      setError(e?.message ?? "Deposit failed");
      setSteps((s) => s.map((x) => x.status === "active" || x.status === "pending" ? { ...x, status: "error", detail: e?.message } : x));
    } finally { setLoading(false); }
  };

  const handleWithdraw = async () => {
    if (!wallet || !withdrawAmt) return;
    setLoading(true); setError(null);
    setSteps([
      { id: "burn", label: "Burn vRLUSD", description: `Burn ${withdrawAmt} share tokens from your wallet`, status: "active" },
      { id: "send", label: "RLUSD Return", description: "Vault sends equivalent RLUSD back to you", status: "pending" },
    ]);
    await delay(600);
    try {
      setSteps((s) => s.map((x) =>
        x.id === "burn" ? { ...x, status: "complete" } :
        x.id === "send" ? { ...x, status: "active" } : x
      ));
      const d: any = await api.lp.withdraw({ lpAddress: wallet, amount: withdrawAmt });
      setSteps((s) => s.map((x) =>
        x.id === "send" ? { ...x, status: "complete", txHash: d.txHash, detail: `${withdrawAmt} RLUSD returned` } : x
      ));
      setWithdrawAmt("");
      refresh();
    } catch (e: any) {
      setError(e?.message ?? "Withdraw failed");
      setSteps((s) => s.map((x) => x.status === "active" || x.status === "pending" ? { ...x, status: "error", detail: e?.message } : x));
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="panel-header flex items-center gap-2">
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="var(--accent-cyan)">
          <rect x="2" y="6" width="12" height="8" rx="1.5" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.2" />
          <path d="M5 6V4.5a3 3 0 016 0V6" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.2" />
        </svg>
        <span>RLUSD Insurance Vault</span>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-panel-border">
        {(["overview", "deposit", "withdraw"] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setSteps([]); setError(null); onTabChange?.(); }}
            className="flex-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider transition"
            style={{
              color: tab === t ? "var(--accent-cyan)" : "rgba(200,214,229,0.3)",
              borderBottom: tab === t ? "2px solid var(--accent-cyan)" : "2px solid transparent",
            }}>
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-3 p-3">
        {tab === "overview" && (
          <>
            {/* Vault headline metrics */}
            <div className="panel p-3 glow-cyan">
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(200,214,229,0.4)" }}>Total Value Locked</div>
              <div className="font-mono text-2xl font-bold" style={{ color: "var(--accent-cyan)" }}>
                {tvl.toLocaleString()} <span className="text-sm font-normal opacity-50">RLUSD</span>
              </div>
            </div>

            {/* Your Position */}
            {vault && (
              <div className="panel p-3">
                <div className="mb-2 text-[9px] font-semibold uppercase tracking-wider"
                  style={{ color: "rgba(200,214,229,0.4)" }}>Your Position</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>vRLUSD Held</div>
                    <div className="font-mono text-base font-bold" style={{ color: "var(--accent-green)" }}>
                      {Number(vault.userVrlusd).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>RLUSD Balance</div>
                    <div className="font-mono text-base font-bold" style={{ color: "var(--accent-amber)" }}>
                      {Number(vault.userRlusd).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Pool Share</div>
                    <div className="font-mono text-base font-bold" style={{ color: "var(--foreground)" }}>
                      {userShare}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Est. APR</div>
                    <div className="font-mono text-base font-bold" style={{ color: "var(--accent-green)" }}>
                      {vault.estimatedApr || "—"}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Risk & Yield */}
            <div className="panel p-3">
              <div className="mb-2 text-[9px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(200,214,229,0.4)" }}>Vault Risk & Yield</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.5)" }}>Active Policies</span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: "var(--accent-cyan)" }}>
                    {activeVoyages.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.5)" }}>Total Exposure</span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: "var(--accent-amber)" }}>
                    {totalExposure.toLocaleString()} RLUSD
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.5)" }}>Premium Income</span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: "var(--accent-green)" }}>
                    +{totalPremiums.toLocaleString()} RLUSD
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.5)" }}>Utilization</span>
                  <span className="font-mono text-[11px] font-bold" style={{ color: Number(utilizationRate) > 80 ? "var(--accent-red)" : "var(--accent-green)" }}>
                    {utilizationRate}%
                  </span>
                </div>
                {/* Utilization bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-sm" style={{ background: "rgba(200,214,229,0.05)" }}>
                  <div className="h-full transition-all duration-500" style={{
                    width: `${Math.min(Number(utilizationRate), 100)}%`,
                    background: Number(utilizationRate) > 80 ? "var(--accent-red)" : Number(utilizationRate) > 50 ? "var(--accent-amber)" : "var(--accent-green)",
                    opacity: 0.7,
                  }} />
                </div>
              </div>
            </div>

            {/* Active Policies table */}
            {activeVoyages.length > 0 && (
              <div className="panel">
                <div className="panel-header">Policies Backed by Vault</div>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr style={{ color: "rgba(200,214,229,0.3)" }}>
                        <th className="px-3 py-1.5 text-left text-[9px] font-semibold uppercase">Voyage</th>
                        <th className="px-3 py-1.5 text-left text-[9px] font-semibold uppercase">Route</th>
                        <th className="px-3 py-1.5 text-right text-[9px] font-semibold uppercase">Insured</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-panel-border">
                      {activeVoyages.map((v) => (
                        <tr key={v.id} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-1.5 font-mono" style={{ color: "var(--accent-cyan)" }}>{v.id}</td>
                          <td className="px-3 py-1.5" style={{ color: "rgba(200,214,229,0.5)" }}>{v.route_name}</td>
                          <td className="px-3 py-1.5 text-right font-mono" style={{ color: "var(--accent-amber)" }}>
                            {Number(v.insured_amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="rounded border p-2.5 text-[10px] leading-relaxed"
              style={{ borderColor: "rgba(0,212,255,0.15)", background: "rgba(0,212,255,0.03)", color: "rgba(200,214,229,0.5)" }}>
              <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-cyan)" }}>
                How the Vault Earns
              </div>
              <div className="space-y-1.5">
                <div><strong style={{ color: "var(--accent-cyan)" }}>1.</strong> You deposit RLUSD → receive vRLUSD share tokens (XRPL issued currency)</div>
                <div><strong style={{ color: "var(--accent-cyan)" }}>2.</strong> Shipowners pay 2% premiums in RLUSD to insure cargo → premiums flow into the vault</div>
                <div><strong style={{ color: "var(--accent-cyan)" }}>3.</strong> If no incident occurs, premiums stay in the vault = profit for LPs</div>
                <div><strong style={{ color: "var(--accent-cyan)" }}>4.</strong> If incident occurs, payout is sent from vault (max = insured amount)</div>
                <div><strong style={{ color: "var(--accent-cyan)" }}>5.</strong> Withdraw anytime by burning vRLUSD → receive proportional RLUSD back</div>
              </div>
            </div>
          </>
        )}

        {tab === "deposit" && (
          <>
            <div className="mb-3 rounded border p-2.5 text-[10px]"
              style={{ borderColor: "rgba(255,170,0,0.2)", background: "rgba(255,170,0,0.04)", color: "rgba(200,214,229,0.7)" }}>
              <strong style={{ color: "var(--accent-amber)" }}>Before depositing:</strong> Send RLUSD from your wallet to the Vault address first. Then enter the amount below and click Deposit to mint vRLUSD to your wallet.
              {vault?.vaultAddress && (
                <div className="mt-1.5 font-mono text-[9px] break-all" style={{ color: "var(--accent-cyan)" }}>
                  Vault: {vault.vaultAddress}
                </div>
              )}
            </div>
            <div className="panel p-3">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-cyan)" }}>
                Deposit RLUSD into Vault
              </div>
              {vault && (
                <div className="mb-3 flex items-center justify-between rounded border p-2"
                  style={{ borderColor: "var(--panel-border)", background: "rgba(0,212,255,0.02)" }}>
                  <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>Your RLUSD balance</span>
                  <span className="font-mono text-sm font-bold" style={{ color: Number(vault.userRlusd) >= Number(depositAmt || 0) ? "var(--accent-amber)" : "var(--accent-red)" }}>
                    {Number(vault.userRlusd).toLocaleString()} RLUSD
                  </span>
                </div>
              )}
              <div className="space-y-2">
                <input type="text" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)}
                  placeholder="Amount in RLUSD" className="input-dark w-full text-[11px]" />
                {depositAmt && (
                  <div className="rounded border p-2 text-[10px]"
                    style={{ borderColor: "rgba(0,255,136,0.1)", background: "rgba(0,255,136,0.02)" }}>
                    <div className="flex justify-between">
                      <span style={{ color: "rgba(200,214,229,0.4)" }}>You will receive</span>
                      <span className="font-mono font-bold" style={{ color: "var(--accent-green)" }}>
                        ~{depositAmt} vRLUSD
                      </span>
                    </div>
                  </div>
                )}
                <button onClick={handleDeposit} disabled={loading || !depositAmt}
                  className="btn btn-cyan w-full py-2.5">{loading ? "Processing..." : "Deposit RLUSD"}</button>
              </div>
            </div>

            <div className="rounded border p-2 text-[10px]"
              style={{ borderColor: "rgba(0,212,255,0.1)", background: "rgba(0,212,255,0.02)", color: "rgba(200,214,229,0.4)" }}>
              <strong style={{ color: "var(--accent-cyan)" }}>Flow:</strong> 1) You send RLUSD to the Vault (from your wallet). 2) Click Deposit here — the backend verifies your balance and mints vRLUSD to your wallet.
            </div>
          </>
        )}

        {tab === "withdraw" && (
          <>
            <div className="panel p-3">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-green)" }}>
                Withdraw from Vault
              </div>
              {vault && (
                <div className="mb-3 flex items-center justify-between rounded border p-2"
                  style={{ borderColor: "var(--panel-border)", background: "rgba(0,255,136,0.02)" }}>
                  <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>Your vRLUSD</span>
                  <span className="font-mono text-sm font-bold" style={{ color: "var(--accent-green)" }}>
                    {Number(vault.userVrlusd).toLocaleString()} vRLUSD
                  </span>
                </div>
              )}
              <div className="space-y-2">
                <input type="text" value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)}
                  placeholder="vRLUSD amount to burn" className="input-dark w-full text-[11px]" />
                {withdrawAmt && (
                  <div className="rounded border p-2 text-[10px]"
                    style={{ borderColor: "rgba(255,170,0,0.1)", background: "rgba(255,170,0,0.02)" }}>
                    <div className="flex justify-between">
                      <span style={{ color: "rgba(200,214,229,0.4)" }}>You will receive</span>
                      <span className="font-mono font-bold" style={{ color: "var(--accent-amber)" }}>
                        ~{withdrawAmt} RLUSD
                      </span>
                    </div>
                  </div>
                )}
                <button onClick={handleWithdraw} disabled={loading || !withdrawAmt}
                  className="btn btn-green w-full py-2.5">{loading ? "Processing..." : "Withdraw RLUSD"}</button>
              </div>
            </div>

            <div className="rounded border p-2 text-[10px]"
              style={{ borderColor: "rgba(0,255,136,0.1)", background: "rgba(0,255,136,0.02)", color: "rgba(200,214,229,0.4)" }}>
              <strong style={{ color: "var(--accent-green)" }}>XRPL Transactions:</strong> Withdraw burns your vRLUSD share tokens and sends proportional RLUSD from the Vault address back to your wallet via an XRPL Payment tx.
            </div>
          </>
        )}

        {/* XRPL Timeline */}
        {steps.length > 0 && <XrplTimeline steps={steps} title="XRPL Transaction Log" />}

        {error && (
          <div className="rounded border p-2 text-[11px]"
            style={{ borderColor: "rgba(255,51,102,0.3)", background: "rgba(255,51,102,0.05)", color: "var(--accent-red)" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
