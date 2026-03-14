"use client";

import { useState, useEffect } from "react";
import { POLYMARKET_MARKET_ID } from "@/config/polymarket";
import { api } from "@/lib/api";
import type { Ship, VaultData, XrplStep } from "@/lib/types";
import XrplTimeline from "./XrplTimeline";

type Props = {
  ship: Ship;
  wallet: string;
  onClose: () => void;
  onComplete: () => void;
};

export default function InsureWizard({ ship, wallet, onClose, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [insuredAmount, setInsuredAmount] = useState(ship.insuredAmount);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [voyageId, setVoyageId] = useState(ship.voyageId || `V-${Date.now().toString(36).toUpperCase()}`);
  const [premium, setPremium] = useState<string | null>(null);
  const [quoteSource, setQuoteSource] = useState<"polymarket" | "default" | "fallback">("default");
  const [estimatedPremium, setEstimatedPremium] = useState<string | null>(null);
  const [premiumErrorDetail, setPremiumErrorDetail] = useState<string | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ txHash: string; nftId: string } | null>(null);
  const [xrplSteps, setXrplSteps] = useState<XrplStep[]>([]);
  const [vault, setVault] = useState<VaultData | null>(null);

  useEffect(() => {
    api.lp.vault(wallet).then((d: any) => setVault(d)).catch(() => {});
  }, [wallet]);

  // Live premium estimate from Polymarket (market ID from config); refresh every 2s for true price
  useEffect(() => {
    const amount = Number(insuredAmount) || 0;
    if (!POLYMARKET_MARKET_ID || amount <= 0) {
      setEstimatedPremium(null);
      setPremiumErrorDetail(null);
      return;
    }
    let cancelled = false;
    const fetchPremium = () => {
      if (cancelled) return;
      setPremiumLoading(true);
      setPremiumErrorDetail(null);
      api.coverage
        .premium({ marketId: POLYMARKET_MARKET_ID, insuredAmount: String(amount) })
        .then((d: any) => {
          if (!cancelled) {
            setEstimatedPremium(d.premium ?? null);
            setPremiumErrorDetail(d.source === "fallback" && d.errorDetail ? d.errorDetail : null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setEstimatedPremium(null);
            setPremiumErrorDetail("Request failed");
          }
        })
        .finally(() => {
          if (!cancelled) setPremiumLoading(false);
        });
    };
    fetchPremium();
    const interval = setInterval(fetchPremium, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [insuredAmount]);

  const premiumCalc = (Number(insuredAmount) * 0.02).toFixed(2);
  const displayPremium = estimatedPremium ?? premiumCalc;
  const userBalance = vault ? Number(vault.userRlusd) : 0;
  const canAfford = userBalance >= Number(displayPremium);

  const getQuote = async () => {
    setError(null);
    try {
      const d: any = await api.coverage.quote({
        insuredAmount,
        startDate,
        endDate,
        ...(POLYMARKET_MARKET_ID ? { marketId: POLYMARKET_MARKET_ID } : {}),
      });
      setPremium(d.premium);
      setQuoteSource(d.source === "polymarket" ? "polymarket" : d.source === "fallback" ? "fallback" : "default");
      setStep(2);
    } catch (e: any) {
      setError(e?.message ?? "Quote failed");
    }
  };

  const bindCoverage = async () => {
    setLoading(true); setError(null); setStep(3);
    setXrplSteps([
      { id: "voyage", label: "Register Voyage", description: "Creating voyage record for " + ship.routeName, status: "active" },
      { id: "premium", label: "Lock Premium", description: `${premium} RLUSD premium payment to Vault`, status: "pending" },
      { id: "nft", label: "Mint Coverage NFT", description: "XLS-20 NFTokenMint transaction on XRPL", status: "pending" },
      { id: "policy", label: "Activate Policy", description: "Policy linked to voyage and NFT", status: "pending" },
    ]);
    await delay(700);
    setXrplSteps((s) => s.map((x) =>
      x.id === "voyage" ? { ...x, status: "complete", detail: `Voyage ${voyageId} registered` } :
      x.id === "premium" ? { ...x, status: "active" } : x
    ));
    await delay(500);
    setXrplSteps((s) => s.map((x) =>
      x.id === "premium" ? { ...x, status: "complete", detail: `${premium} RLUSD locked` } :
      x.id === "nft" ? { ...x, status: "active" } : x
    ));
    try {
      const d: any = await api.coverage.bind({
        voyageId,
        routeName: ship.routeName,
        insuredAmount,
        startDate,
        endDate,
        premiumAmount: premium!,
        ownerAddress: wallet,
      });
      setXrplSteps((s) => s.map((x) =>
        x.id === "nft" ? { ...x, status: "complete", txHash: d.txHash, detail: `NFT: ${(d.nftId || "").slice(0, 16)}...` } :
        x.id === "policy" ? { ...x, status: "complete", detail: `Policy #${d.policyId} active` } : x
      ));
      setResult({ txHash: d.txHash, nftId: d.nftId });
      setStep(4);
    } catch (e: any) {
      setError(e?.message ?? "Bind failed");
      setXrplSteps((s) => s.map((x) =>
        x.status === "active" || x.status === "pending"
          ? { ...x, status: "error", detail: e?.message } : x
      ));
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="var(--accent-green)">
            <path d="M8 1L2 4v4.5c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4L8 1z" />
          </svg>
          <span>Purchase Coverage</span>
        </div>
        <button onClick={onClose} className="text-foreground/30 hover:text-foreground/60">&times;</button>
      </div>

      {/* Step indicator */}
      <div className="flex border-b border-panel-border">
        {["Configure", "Review", "Processing", "Complete"].map((label, i) => (
          <div key={label} className="flex-1 px-2 py-2 text-center text-[9px] font-semibold uppercase tracking-wider"
            style={{
              color: step > i + 1 ? "var(--accent-green)" : step === i + 1 ? "var(--accent-cyan)" : "rgba(200,214,229,0.2)",
              borderBottom: step === i + 1 ? "2px solid var(--accent-cyan)" : "2px solid transparent",
            }}>
            {label}
          </div>
        ))}
      </div>

      <div className="flex-1 space-y-3 p-3">
        {/* Claim settled guard */}
        {ship.policyStatus === "claim_paid" && (
          <div className="space-y-3">
            <div className="rounded border p-4 text-center"
              style={{ borderColor: "rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.04)" }}>
              <div className="text-[11px] font-semibold" style={{ color: "var(--accent-green)" }}>Claim Settled</div>
              <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
                This vessel&apos;s claim has already been paid out. Coverage can no longer be purchased.
              </div>
            </div>
            <button onClick={onClose} className="btn btn-cyan w-full py-2.5 text-[11px]">
              Back to Dashboard
            </button>
          </div>
        )}

        {ship.policyStatus !== "claim_paid" && (<>
        {/* Ship info */}
        <div className="flex items-center justify-between rounded border p-2.5"
          style={{ borderColor: "var(--panel-border)", background: "rgba(0,212,255,0.03)" }}>
          <div>
            <div className="font-mono text-xs font-bold" style={{ color: "var(--accent-cyan)" }}>
              {ship.name}
            </div>
            <div className="text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
              {ship.routeName} &middot; {ship.imo}
            </div>
          </div>
          {vault && (
            <div className="text-right">
              <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Your Balance</div>
              <div className="font-mono text-[11px] font-bold" style={{ color: "var(--accent-amber)" }}>
                {Number(vault.userRlusd).toLocaleString()} RLUSD
              </div>
            </div>
          )}
        </div>

        {/* Step 1: Configure */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(200,214,229,0.4)" }}>Voyage ID</label>
              <input type="text" value={voyageId} onChange={(e) => setVoyageId(e.target.value)}
                className="input-dark w-full text-[11px]" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(200,214,229,0.4)" }}>Insured Amount (RLUSD)</label>
              <input type="text" value={insuredAmount} onChange={(e) => setInsuredAmount(e.target.value)}
                className="input-dark w-full text-[11px]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "rgba(200,214,229,0.4)" }}>Start</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="input-dark w-full text-[11px]" />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "rgba(200,214,229,0.4)" }}>End</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="input-dark w-full text-[11px]" />
              </div>
            </div>

            {/* Live premium estimate */}
            <div className="rounded border p-2.5" style={{ borderColor: "rgba(255,170,0,0.15)", background: "rgba(255,170,0,0.03)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
                  Estimated Premium
                </span>
                <span className="font-mono text-sm font-bold" style={{ color: "var(--accent-amber)" }}>
                  {premiumLoading ? "…" : `${displayPremium} RLUSD`}
                </span>
              </div>
              {premiumErrorDetail && (
                <div className="mt-1 text-[9px]" style={{ color: "var(--accent-amber)" }}>
                  Fallback rate used: {premiumErrorDetail}
                </div>
              )}
              {!canAfford && Number(insuredAmount) > 0 && (
                <div className="mt-1 text-[9px]" style={{ color: "var(--accent-red)" }}>
                  Insufficient RLUSD balance
                </div>
              )}
            </div>

            <button onClick={getQuote} disabled={!insuredAmount || (!canAfford && Number(insuredAmount) > 0)}
              className="btn btn-green w-full py-2.5">
              Get Official Quote
            </button>

            {/* Quick policy terms */}
            <div className="rounded border p-2 text-[10px] leading-relaxed"
              style={{ borderColor: "rgba(0,212,255,0.1)", background: "rgba(0,212,255,0.02)", color: "rgba(200,214,229,0.35)" }}>
              <div className="mb-1 text-[9px] font-semibold uppercase" style={{ color: "var(--accent-cyan)" }}>Policy Terms</div>
              <div>&#8226; Parametric coverage — payout on oracle-confirmed incident</div>
              <div>&#8226; 100% of insured amount paid if triggered</div>
              <div>&#8226; Coverage NFT (XLS-20) minted as proof</div>
              <div>&#8226; Backed by RLUSD vault (TVL: {vault ? Number(vault.tvl).toLocaleString() : "—"})</div>
            </div>
          </div>
        )}

        {/* Step 2: Review Quote */}
        {step === 2 && premium && (
          <div className="space-y-3">
            <div className="panel p-3 glow-green">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "rgba(200,214,229,0.4)" }}>Coverage Quote</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Insured Amount</div>
                  <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-cyan)" }}>
                    {Number(insuredAmount).toLocaleString()} RLUSD
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>
                    Premium {quoteSource === "polymarket" ? "(Polymarket)" : quoteSource === "fallback" ? "(fallback)" : "(2%)"}
                  </div>
                  <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-amber)" }}>
                    {premium} RLUSD
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Period</div>
                  <div className="text-xs">{startDate} &rarr; {endDate}</div>
                </div>
                <div>
                  <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Route</div>
                  <div className="text-xs">{ship.routeName}</div>
                </div>
              </div>
            </div>

            {/* What you get */}
            <div className="panel p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-green)" }}>
                What You Get
              </div>
              <div className="space-y-2 text-[10px]" style={{ color: "rgba(200,214,229,0.5)" }}>
                <div className="flex items-center justify-between rounded border p-1.5" style={{ borderColor: "var(--panel-border)" }}>
                  <span>Coverage NFT (XLS-20)</span>
                  <span className="font-mono font-bold" style={{ color: "var(--accent-green)" }}>Minted to your wallet</span>
                </div>
                <div className="flex items-center justify-between rounded border p-1.5" style={{ borderColor: "var(--panel-border)" }}>
                  <span>Payout on incident</span>
                  <span className="font-mono font-bold" style={{ color: "var(--accent-green)" }}>{Number(insuredAmount).toLocaleString()} RLUSD</span>
                </div>
                <div className="flex items-center justify-between rounded border p-1.5" style={{ borderColor: "var(--panel-border)" }}>
                  <span>Settlement</span>
                  <span className="font-mono font-bold" style={{ color: "var(--accent-green)" }}>Instant (XRPL Payment tx)</span>
                </div>
              </div>
            </div>

            {/* XRPL steps preview */}
            <div className="panel p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-cyan)" }}>
                XRPL Transactions (on confirm)
              </div>
              <div className="space-y-1.5 text-[10px]" style={{ color: "rgba(200,214,229,0.45)" }}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "var(--accent-cyan)" }} />
                  <span><strong>1.</strong> Voyage registered on-chain</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "var(--accent-amber)" }} />
                  <span><strong>2.</strong> <code style={{ color: "var(--accent-cyan)" }}>Payment</code> tx: {premium} RLUSD → Vault</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "var(--accent-green)" }} />
                  <span><strong>3.</strong> <code style={{ color: "var(--accent-cyan)" }}>NFTokenMint</code> tx: Coverage NFT → your wallet</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: "var(--accent-green)" }} />
                  <span><strong>4.</strong> Policy activated and linked</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="btn btn-cyan flex-1">Back</button>
              <button onClick={bindCoverage} className="btn btn-green flex-1 py-2.5">
                Confirm &amp; Pay {premium} RLUSD
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 3 && (
          <XrplTimeline steps={xrplSteps} title="Binding Coverage on XRPL" />
        )}

        {/* Step 4: Complete */}
        {step === 4 && result && (
          <div className="space-y-3">
            <div className="rounded border p-4 text-center"
              style={{ borderColor: "rgba(0,255,136,0.3)", background: "rgba(0,255,136,0.04)" }}>
              <div className="mb-2 text-2xl">&#10003;</div>
              <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-green)" }}>
                Coverage Active
              </div>
              <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.5)" }}>
                Your cargo is now insured on XRPL
              </div>
            </div>

            <XrplTimeline steps={xrplSteps} title="XRPL Transaction Log" />

            {result.nftId && (
              <div className="panel p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "rgba(200,214,229,0.35)" }}>Your Coverage NFT</div>
                <code className="mt-1 block break-all font-mono text-[10px]" style={{ color: "var(--accent-cyan)" }}>
                  {result.nftId}
                </code>
                <a href={`https://testnet.xrpl.org/nft/${result.nftId}`} target="_blank" rel="noopener noreferrer"
                  className="mt-1 inline-block text-[10px] hover:underline" style={{ color: "rgba(0,212,255,0.6)" }}>
                  View on XRPL Explorer &rarr;
                </a>
                <div className="mt-1 text-[9px]" style={{ color: "rgba(200,214,229,0.3)" }}>
                  This XLS-20 NFT is your proof of coverage. It will be burned when the voyage resolves.
                </div>
              </div>
            )}

            <button onClick={() => { onComplete(); onClose(); }} className="btn btn-cyan w-full py-2.5">
              Done — View My Policies
            </button>
          </div>
        )}

        {error && (
          <div className="rounded border p-2 text-[11px]"
            style={{ borderColor: "rgba(255,51,102,0.3)", background: "rgba(255,51,102,0.05)", color: "var(--accent-red)" }}>
            {error}
            {step === 3 && (
              <button onClick={() => { setStep(2); setError(null); }} className="btn btn-red mt-2 w-full text-[10px]">
                Retry
              </button>
            )}
          </div>
        )}
        </>)}
      </div>
    </div>
  );
}

function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
