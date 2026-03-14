"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { Policy, VaultData } from "@/lib/types";

type Props = {
  wallet: string;
};

export default function CoverageCenter({ wallet }: Props) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [vault, setVault] = useState<VaultData | null>(null);
  const [tab, setTab] = useState<"policies" | "conditions">("policies");

  useEffect(() => {
    if (!wallet) return;
    const fetch = () => {
      api.coverage.policies(wallet).then((d: any) => setPolicies(d.policies ?? [])).catch(() => {});
      api.lp.vault(wallet).then((d: any) => setVault(d)).catch(() => {});
    };
    fetch();
    const t = setInterval(fetch, 10000);
    return () => clearInterval(t);
  }, [wallet]);

  const activePolicies = policies.filter((p) => p.status === "active");
  const claimPolicies = policies.filter((p) => p.status === "claim_paid");
  const totalPremiumsPaid = policies.reduce((sum, p) => sum + Number(p.premium_amount), 0);
  const totalCoverage = activePolicies.length; // We don't have insured_amount on policy, so use count

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="panel-header flex items-center gap-2">
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="var(--accent-green)">
          <path d="M8 1L2 4v4.5c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4L8 1zm0 2l4 2v3.5c0 2.6-1.8 4.8-4 5.8-2.2-1-4-3.2-4-5.8V5l4-2z" />
        </svg>
        <span>Coverage Center</span>
      </div>

      {/* Balance summary */}
      <div className="border-b border-panel-border p-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>RLUSD Balance</div>
            <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-cyan)" }}>
              {vault ? Number(vault.userRlusd).toLocaleString() : "—"}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Active Policies</div>
            <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-green)" }}>
              {activePolicies.length}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Premiums Paid</div>
            <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-amber)" }}>
              {totalPremiumsPaid.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-panel-border">
        {(["policies", "conditions"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wider transition"
            style={{
              color: tab === t ? "var(--accent-green)" : "rgba(200,214,229,0.3)",
              borderBottom: tab === t ? "2px solid var(--accent-green)" : "2px solid transparent",
            }}>
            {t === "policies" ? "My Policies" : "Policy Terms"}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 p-3">
        {tab === "policies" && (
          <>
            {policies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg viewBox="0 0 48 48" className="mb-3 h-12 w-12 opacity-10" fill="currentColor">
                  <path d="M24 4L8 12v12c0 8 5.5 15.5 16 18 10.5-2.5 16-10 16-18V12L24 4z" />
                </svg>
                <div className="text-[11px] font-semibold" style={{ color: "rgba(200,214,229,0.4)" }}>
                  No policies yet
                </div>
                <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.25)" }}>
                  Select a vessel from the map or sidebar to request a coverage quote
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {policies.map((p) => (
                  <div key={p.id} className={`panel p-2.5 ${p.status === "active" ? "glow-green" : p.status === "claim_paid" ? "glow-amber" : ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold" style={{ color: "var(--accent-cyan)" }}>
                        {p.voyage_id}
                      </span>
                      <span className={`badge ${p.status === "active" ? "badge-active" : p.status === "claim_paid" ? "badge-incident" : "badge-expired"}`}>
                        {p.status}
                      </span>
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Premium Paid</div>
                        <div className="font-mono text-[11px] font-bold" style={{ color: "var(--accent-amber)" }}>
                          {p.premium_amount} RLUSD
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Coverage NFT</div>
                        {p.nft_id ? (
                          <a href={`https://testnet.xrpl.org/nft/${p.nft_id}`} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[10px] hover:underline" style={{ color: "rgba(0,212,255,0.6)" }}>
                            {p.nft_id.slice(0, 12)}...
                          </a>
                        ) : (
                          <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.2)" }}>Pending</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-[9px]" style={{ color: "rgba(200,214,229,0.25)" }}>
                      Created: {p.created_at?.slice(0, 16)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="rounded border border-dashed p-3 text-center"
              style={{ borderColor: "rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.02)" }}>
              <div className="text-[10px] font-semibold" style={{ color: "var(--accent-green)" }}>
                Request New Coverage
              </div>
              <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>
                Click any vessel on the map to get an instant quote and purchase parametric insurance
              </div>
            </div>
          </>
        )}

        {tab === "conditions" && (
          <div className="space-y-3">
            {/* Policy Terms */}
            <div className="panel p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-green)" }}>
                Parametric Insurance Terms
              </div>
              <div className="space-y-2.5 text-[10px] leading-relaxed" style={{ color: "rgba(200,214,229,0.5)" }}>
                <PolicyTerm
                  label="Coverage Type"
                  value="Parametric Marine Cargo Insurance"
                  detail="Payouts triggered by verifiable events, not loss assessment"
                />
                <PolicyTerm
                  label="Premium Rate"
                  value="2% of insured amount"
                  detail="Flat rate applied at time of binding. Paid in RLUSD."
                />
                <PolicyTerm
                  label="Payout Trigger"
                  value="Oracle-confirmed incident"
                  detail="When the oracle reports an incident on the voyage, payout is automatic"
                />
                <PolicyTerm
                  label="Payout Amount"
                  value="100% of insured amount"
                  detail="Full insured value paid from vault to policy holder's wallet"
                />
                <PolicyTerm
                  label="Coverage Period"
                  value="Voyage start → end date"
                  detail="Coverage is active between the dates specified at binding"
                />
                <PolicyTerm
                  label="Proof of Coverage"
                  value="XLS-20 NFT on XRPL"
                  detail="An NFT is minted to your wallet as immutable proof of your policy"
                />
                <PolicyTerm
                  label="Settlement"
                  value="Instant on-chain"
                  detail="Payouts are XRPL Payment transactions — no paperwork, no delays"
                />
                <PolicyTerm
                  label="Backed By"
                  value={`RLUSD Vault (TVL: ${vault ? Number(vault.tvl).toLocaleString() : "—"} RLUSD)`}
                  detail="LP providers deposit RLUSD to back coverage. Vault address is on-chain."
                />
              </div>
            </div>

            {/* XRPL Transaction Flow */}
            <div className="panel p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-cyan)" }}>
                What Happens on XRPL
              </div>
              <div className="space-y-2 text-[10px]" style={{ color: "rgba(200,214,229,0.45)" }}>
                <FlowStep n={1} color="var(--accent-cyan)" text="You request a coverage quote (off-chain calculation)" />
                <FlowStep n={2} color="var(--accent-amber)" text="Premium Payment: XRPL Payment tx sends RLUSD from your wallet to the Vault" />
                <FlowStep n={3} color="var(--accent-green)" text="NFT Mint: XRPL NFTokenMint tx creates your coverage NFT (XLS-20)" />
                <FlowStep n={4} color="var(--accent-green)" text="Policy record created on-chain, linked to voyage ID and NFT" />
                <div className="mt-1 border-t border-panel-border pt-2">
                  <span style={{ color: "var(--accent-red)" }}>If incident:</span> Oracle triggers payout → XRPL Payment tx from Vault → NFT burned
                </div>
                <div>
                  <span style={{ color: "var(--accent-green)" }}>If no incident:</span> Policy expires → NFT burned → Premium stays in vault for LPs
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PolicyTerm({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded border p-2" style={{ borderColor: "var(--panel-border)", background: "rgba(0,255,136,0.01)" }}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>
          {label}
        </span>
        <span className="font-mono text-[10px] font-bold" style={{ color: "var(--accent-green)" }}>
          {value}
        </span>
      </div>
      <div className="mt-0.5 text-[9px]" style={{ color: "rgba(200,214,229,0.3)" }}>{detail}</div>
    </div>
  );
}

function FlowStep({ n, color, text }: { n: number; color: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}>
        {n}
      </div>
      <span>{text}</span>
    </div>
  );
}
