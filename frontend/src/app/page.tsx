"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Ship, Property, VaultData, Voyage, Policy, Role } from "@/lib/types";
import { POLYMARKET_MARKET_ID } from "@/config/polymarket";
import {
  MOCK_SHIPS,
  MOCK_PROPERTIES,
  MOCK_DISASTER_ZONES,
} from "@/lib/mock-data";
import RoleSelector from "@/components/RoleSelector";
import VaultPanel from "@/components/VaultPanel";
import InsureWizard from "@/components/InsureWizard";
import CoverageCenter from "@/components/CoverageCenter";
import WalletBar from "@/components/WalletBar";
import PolicyDetailPage from "@/components/PolicyDetailPage";
import PropertyDetailPage from "@/components/PropertyDetailPage";

const MaritimeMap = dynamic(() => import("@/components/map/MaritimeMap"), { ssr: false });
const DisasterMap = dynamic(() => import("@/components/map/DisasterMap"), { ssr: false });

type Mode = "maritime" | "disaster";
type SidebarFilter = "open" | "all";

function StatusDot({ color }: { color: string }) {
  return (
    <span className="animate-pulse-glow inline-block h-2 w-2 rounded-full" style={{ background: color }} />
  );
}

function MetricCard({ label, value, sub, color = "var(--accent-cyan)" }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="panel p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.4)" }}>
        {label}
      </div>
      <div className="mt-1 font-mono text-xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="mt-0.5 text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [role, setRole] = useState<Role | null>(null);
  const [wallet, setWallet] = useState("");
  const [mode, setMode] = useState<Mode>("maritime");
  const [selectedShip, setSelectedShip] = useState<Ship | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [insuring, setInsuring] = useState(false);
  const [detailShip, setDetailShip] = useState<Ship | null>(null); // full detail page
  const [detailProperty, setDetailProperty] = useState<Property | null>(null); // full detail page
  const [vault, setVault] = useState<VaultData | null>(null);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>("open");
  const [disasterFilter, setDisasterFilter] = useState<SidebarFilter>("open");
  const [time, setTime] = useState<Date | null>(null);
  const [vaultPanelOpenTab, setVaultPanelOpenTab] = useState<"deposit" | "withdraw" | null>(null);
  // Live premium at top (from config market ID; amount from selected vessel or default)
  const [livePremium, setLivePremium] = useState<{ premium: string; source: string } | null>(null);
  const [livePremiumLoading, setLivePremiumLoading] = useState(false);
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [marketPriceSource, setMarketPriceSource] = useState<string | null>(null);
  const [marketPriceLoading, setMarketPriceLoading] = useState(false);
  const livePremiumAmount = selectedShip?.insuredAmount ?? "45000";
  const livePremiumFallback =
    (Number(livePremiumAmount) || 0) > 0
      ? ((Number(livePremiumAmount) * 0.02)).toFixed(2)
      : null;
  const livePremiumDisplay =
    livePremium?.premium ?? (livePremiumLoading ? null : livePremiumFallback);

  useEffect(() => {
    setTime(new Date());
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch live premium (maritime only) — market ID from config; refetch periodically so it stays live
  useEffect(() => {
    const amount = Number(livePremiumAmount) || 0;
    if (mode !== "maritime" || !POLYMARKET_MARKET_ID || amount <= 0) {
      setLivePremium(null);
      setMarketPrice(null);
      return;
    }
    let cancelled = false;
    const fetchPremium = () => {
      if (cancelled) return;
      setLivePremiumLoading(true);
      api.coverage
        .premium({ marketId: POLYMARKET_MARKET_ID, insuredAmount: String(amount) })
        .then((d: any) => {
          if (!cancelled) setLivePremium({ premium: d.premium ?? "—", source: d.source ?? "default" });
        })
        .catch(() => {
          if (!cancelled) setLivePremium(null);
        })
        .finally(() => {
          if (!cancelled) setLivePremiumLoading(false);
        });
    };
    fetchPremium();
    const interval = setInterval(fetchPremium, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [mode, livePremiumAmount]);

  // Fetch Polymarket raw price for header (maritime only); refresh every 2s so true price is visible
  useEffect(() => {
    if (mode !== "maritime" || !POLYMARKET_MARKET_ID) {
      setMarketPrice(null);
      setMarketPriceSource(null);
      setMarketPriceLoading(false);
      return;
    }
    let cancelled = false;
    const fetchPrice = () => {
      if (cancelled) return;
      setMarketPriceLoading(true);
      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
      console.log("[Polymarket] Fetching market price", { base, path: "/coverage/market-price" });
      api.coverage.marketPrice(POLYMARKET_MARKET_ID).then((d: any) => {
        if (!cancelled) {
          const p = d?.price;
          const num = typeof p === "number" ? p : typeof p === "string" ? Number(p) : null;
          // Successful response = from Polymarket (this endpoint has no fallback)
          const src = num != null ? (d?.source ?? "polymarket") : null;
          console.log("[Polymarket] Market price response", { raw: p, parsed: num, source: src });
          setMarketPrice(num);
          setMarketPriceSource(src);
        }
      }).catch((err: unknown) => {
        if (!cancelled) {
          setMarketPrice(null);
          setMarketPriceSource(null);
        }
        console.warn("[Polymarket] Market price fetch failed", err);
      }).finally(() => {
        if (!cancelled) setMarketPriceLoading(false);
      });
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [mode]);

  const refreshData = useCallback(() => {
    api.lp.vault(wallet || undefined).then((d: any) => setVault(d)).catch(() => {});
    api.oracle.voyages().then((d: any) => setVoyages(d.voyages ?? d ?? [])).catch(() => {});
    if (wallet) api.coverage.policies(wallet).then((d: any) => setPolicies(d.policies ?? [])).catch(() => {});
  }, [wallet]);

  useEffect(() => { refreshData(); const t = setInterval(refreshData, 15000); return () => clearInterval(t); }, [refreshData]);

  const handleSelectShip = useCallback((s: Ship | null) => {
    setSelectedShip(s); setSelectedProperty(null); setInsuring(false);
  }, []);

  const handleSelectProperty = useCallback((p: Property | null) => {
    setSelectedProperty(p); setSelectedShip(null); setInsuring(false);
  }, []);

  const handleRoleSelect = useCallback((r: Role, w: string) => {
    setRole(r); setWallet(w);
  }, []);

  // Filter ships — "open" = active policyStatus or uninsured (not claim_paid/expired)
  const filteredShips = useMemo(() => {
    if (sidebarFilter === "all") return MOCK_SHIPS;
    return MOCK_SHIPS.filter((s) =>
      s.policyStatus === "active" || s.policyStatus === "uninsured"
    );
  }, [sidebarFilter]);

  const openCount = MOCK_SHIPS.filter((s) => s.policyStatus === "active" || s.policyStatus === "uninsured").length;

  // Filter properties — "open" = active or uninsured (not expired/claim_paid)
  const filteredProperties = useMemo(() => {
    if (disasterFilter === "all") return MOCK_PROPERTIES;
    return MOCK_PROPERTIES.filter((p) =>
      p.policyStatus === "active" || p.policyStatus === "uninsured"
    );
  }, [disasterFilter]);

  const openPropCount = MOCK_PROPERTIES.filter((p) => p.policyStatus === "active" || p.policyStatus === "uninsured").length;

  const maritimeStats = useMemo(() => {
    const active = MOCK_SHIPS.filter((s) => s.status === "underway").length;
    const incidents = MOCK_SHIPS.filter((s) => s.status === "incident").length;
    return { active, incidents, total: MOCK_SHIPS.length };
  }, []);

  const disasterStats = useMemo(() => {
    const destroyed = MOCK_PROPERTIES.filter((p) => p.damageLevel === "destroyed").length;
    const severe = MOCK_PROPERTIES.filter((p) => p.damageLevel === "severe").length;
    const claimed = MOCK_PROPERTIES.filter((p) => p.claimStatus === "claim_paid").length;
    const pending = MOCK_PROPERTIES.filter((p) => p.claimStatus === "pending").length;
    return { destroyed, severe, claimed, pending, total: MOCK_PROPERTIES.length };
  }, []);

  const activeVoyages = voyages.filter((v) => v.status === "active");
  const totalExposure = activeVoyages.reduce((sum, v) => sum + Number(v.insured_amount), 0);

  return (
    <div className="palantir-grid flex h-screen flex-col overflow-hidden">
      {/* Role selector overlay */}
      {!role && <RoleSelector onSelect={handleRoleSelect} />}

      {/* Full policy detail page overlay */}
      {detailShip && role && (
        <PolicyDetailPage
          ship={detailShip}
          role={role}
          wallet={wallet}
          onClose={() => setDetailShip(null)}
          onInsure={() => {
            setSelectedShip(detailShip);
            setInsuring(true);
            setDetailShip(null);
          }}
          onDeposit={() => {
            setDetailShip(null);
            setSelectedShip(null);
            setVaultPanelOpenTab("deposit");
          }}
        />
      )}

      {/* Full property detail page overlay */}
      {detailProperty && role && (
        <PropertyDetailPage
          property={detailProperty}
          role={role}
          wallet={wallet}
          onClose={() => setDetailProperty(null)}
          onInsure={() => {
            setDetailProperty(null);
          }}
          onDeposit={() => {
            setDetailProperty(null);
            setSelectedProperty(null);
            setVaultPanelOpenTab("deposit");
          }}
        />
      )}

      {/* Top Bar */}
      <header className="flex items-center justify-between border-b border-panel-border bg-panel/80 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded"
              style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)" }}>
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="var(--accent-cyan)">
                <path d="M10 2L3 7v6l7 5 7-5V7l-7-5zm0 2.5L14.5 8 10 11.5 5.5 8 10 4.5z" />
              </svg>
            </div>
            <span className="font-mono text-sm font-bold tracking-wider" style={{ color: "var(--accent-cyan)" }}>
              AEGIS
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center rounded border border-panel-border bg-background/50">
            <button
              onClick={() => { setMode("maritime"); setSelectedProperty(null); }}
              className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                mode === "maritime" ? "bg-accent-cyan/15 text-accent-cyan" : "text-foreground/30 hover:text-foreground/60"
              }`}>Maritime</button>
            <button
              onClick={() => { setMode("disaster"); setSelectedShip(null); }}
              className={`px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                mode === "disaster" ? "bg-accent-red/15 text-accent-red" : "text-foreground/30 hover:text-foreground/60"
              }`}>Disaster Relief</button>
          </div>

          {/* Role indicator */}
          {role && (
            <div className="flex items-center gap-2 rounded border px-3 py-1.5"
              style={{
                borderColor: role === "provider" ? "rgba(0,212,255,0.2)" : "rgba(0,255,136,0.2)",
                background: role === "provider" ? "rgba(0,212,255,0.05)" : "rgba(0,255,136,0.05)",
              }}>
              <span className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: role === "provider" ? "var(--accent-cyan)" : "var(--accent-green)" }}>
                {role === "provider" ? "LP Provider" : "Shipowner"}
              </span>
              <span className="font-mono text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>
                {wallet.slice(0, 6)}...{wallet.slice(-4)}
              </span>
              <button onClick={() => { setRole(null); setWallet(""); }}
                className="text-[10px] hover:underline" style={{ color: "rgba(200,214,229,0.3)" }}>
                Switch
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-1 items-center justify-center gap-4">
          {/* Polymarket live price — blinking live indicator + probability through strait */}
          {mode === "maritime" && (
            <div
              className="flex items-center gap-2.5 rounded-lg border px-3 py-1.5"
              style={{
                borderColor: "rgba(0,255,136,0.35)",
                background: "linear-gradient(135deg, rgba(0,255,136,0.14) 0%, rgba(0,200,120,0.08) 100%)",
              }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-green)]"
                style={{
                  boxShadow: "0 0 6px var(--accent-green)",
                  animation: "blink 1.2s ease-in-out infinite",
                }}
                title="Live"
              />
              <span className="text-[10px] leading-tight" style={{ color: "rgba(200,214,229,0.85)", maxWidth: "140px" }}>
                Live probability of safe passage through the strait
              </span>
              <span className="font-mono text-base font-bold tabular-nums" style={{ color: "var(--accent-green)" }}>
                {marketPriceLoading && marketPrice == null ? "…" : marketPrice != null ? (marketPrice * 100).toFixed(1) + "%" : "—"}
              </span>
              <span className="flex h-4 w-4 items-center justify-center rounded bg-white p-0.5">
                <img src="/polymarket-logo.png" alt="Polymarket" className="h-2.5 w-2.5 object-contain" />
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {wallet && <WalletBar wallet={wallet} />}
          <div className="flex items-center gap-2">
            <StatusDot color="var(--accent-green)" />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.4)" }}>
              XRPL Testnet
            </span>
          </div>
          <div className="font-mono text-xs" style={{ color: "rgba(200,214,229,0.35)" }} suppressHydrationWarning>
            {time ? time.toISOString().replace("T", " ").slice(0, 19) : "—"} UTC
          </div>
          <Link href="/admin" className="btn btn-amber text-[10px]">Oracle</Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="flex w-72 flex-col border-r border-panel-border bg-panel/60">
          {/* Header with filter */}
          <div className="border-b border-panel-border">
            <div className="panel-header flex items-center justify-between">
              <span>{mode === "maritime" ? "Coverage Marketplace" : "Property Coverage"}</span>
              <span className="font-mono text-accent-cyan">
                {mode === "maritime" ? filteredShips.length : filteredProperties.length}
              </span>
            </div>
            <div className="flex border-t border-panel-border">
              <button
                onClick={() => mode === "maritime" ? setSidebarFilter("open") : setDisasterFilter("open")}
                className="flex-1 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider transition"
                style={{
                  color: (mode === "maritime" ? sidebarFilter : disasterFilter) === "open" ? "var(--accent-green)" : "rgba(200,214,229,0.3)",
                  background: (mode === "maritime" ? sidebarFilter : disasterFilter) === "open" ? "rgba(0,255,136,0.05)" : "transparent",
                }}>
                Open ({mode === "maritime" ? openCount : openPropCount})
              </button>
              <button
                onClick={() => mode === "maritime" ? setSidebarFilter("all") : setDisasterFilter("all")}
                className="flex-1 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider transition"
                style={{
                  color: (mode === "maritime" ? sidebarFilter : disasterFilter) === "all" ? "var(--accent-cyan)" : "rgba(200,214,229,0.3)",
                  background: (mode === "maritime" ? sidebarFilter : disasterFilter) === "all" ? "rgba(0,212,255,0.05)" : "transparent",
                }}>
                All ({mode === "maritime" ? MOCK_SHIPS.length : MOCK_PROPERTIES.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {mode === "maritime"
              ? filteredShips.map((ship) => (
                  <div
                    key={ship.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectShip(ship)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelectShip(ship); } }}
                    className={`w-full cursor-pointer border-b border-panel-border px-3 py-2.5 text-left transition hover:bg-white/[0.03] ${
                      selectedShip?.id === ship.id ? "bg-accent-cyan/[0.06]" : ""
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold" style={{ color: "var(--accent-cyan)" }}>
                        {ship.name}
                      </span>
                      <StatusDot color={ship.status === "incident" ? "var(--accent-red)" : ship.status === "anchored" ? "var(--accent-amber)" : "var(--accent-green)"} />
                    </div>
                    <div className="mt-0.5 text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
                      {ship.routeName}
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {ship.policyStatus === "uninsured" ? (
                          <span className="badge" style={{ background: "rgba(255,170,0,0.12)", color: "var(--accent-amber)", border: "1px solid rgba(255,170,0,0.2)" }}>
                            NEEDS COVERAGE
                          </span>
                        ) : ship.policyStatus === "active" ? (
                          <span className="badge badge-active">INSURED</span>
                        ) : (
                          <span className="badge badge-expired">{ship.policyStatus}</span>
                        )}
                      </div>
                      <span className="font-mono text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>
                        {Number(ship.insuredAmount).toLocaleString()} <span className="text-[8px]">RLUSD</span>
                      </span>
                    </div>
                    {/* View details link */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDetailShip(ship); }}
                      className="mt-1.5 w-full rounded border py-1 text-center text-[9px] font-semibold uppercase tracking-wider transition hover:bg-white/[0.03]"
                      style={{ borderColor: "rgba(0,212,255,0.15)", color: "var(--accent-cyan)" }}>
                      View Full Details &rarr;
                    </button>
                  </div>
                ))
              : filteredProperties.map((prop) => (
                  <div
                    key={prop.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectProperty(prop)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelectProperty(prop); } }}
                    className={`w-full cursor-pointer border-b border-panel-border px-3 py-2.5 text-left transition hover:bg-white/[0.03] ${
                      selectedProperty?.id === prop.id ? "bg-accent-cyan/[0.06]" : ""
                    }`}>
                    <div className="font-mono text-[11px] font-semibold" style={{ color: "var(--accent-cyan)" }}>
                      {prop.address}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px]">
                      <span className="badge" style={{
                        background: prop.damageLevel === "destroyed" || prop.damageLevel === "severe" ? "rgba(255,51,102,0.12)" : prop.damageLevel === "moderate" ? "rgba(255,136,0,0.12)" : prop.damageLevel === "minor" ? "rgba(255,170,0,0.12)" : "rgba(0,255,136,0.12)",
                        color: prop.damageLevel === "destroyed" || prop.damageLevel === "severe" ? "var(--accent-red)" : prop.damageLevel === "moderate" ? "#ff8800" : prop.damageLevel === "minor" ? "var(--accent-amber)" : "var(--accent-green)",
                        border: "1px solid currentColor",
                      }}>{prop.damageLevel}</span>
                      {prop.policyStatus === "uninsured" ? (
                        <span className="badge" style={{ background: "rgba(255,170,0,0.12)", color: "var(--accent-amber)", border: "1px solid rgba(255,170,0,0.2)" }}>
                          NEEDS COVERAGE
                        </span>
                      ) : prop.policyStatus === "active" ? (
                        <span className="badge badge-active">INSURED</span>
                      ) : (
                        <span className="badge badge-expired">{prop.policyStatus}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[10px]">
                      <span className="font-mono" style={{ color: "rgba(200,214,229,0.35)" }}>
                        {Number(prop.insuredAmount).toLocaleString()} <span className="text-[8px]">RLUSD</span>
                      </span>
                      {prop.claimStatus === "pending" && <span className="badge badge-pending">CLAIM PENDING</span>}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDetailProperty(prop); }}
                      className="mt-1.5 w-full rounded border py-1 text-center text-[9px] font-semibold uppercase tracking-wider transition hover:bg-white/[0.03]"
                      style={{ borderColor: "rgba(0,212,255,0.15)", color: "var(--accent-cyan)" }}>
                      View Full Details &rarr;
                    </button>
                  </div>
                ))}
          </div>
        </aside>

        {/* Map Area */}
        <main className="relative flex-1">
          {mode === "maritime" ? (
            <MaritimeMap ships={MOCK_SHIPS} selectedShip={selectedShip} onSelectShip={handleSelectShip} />
          ) : (
            <DisasterMap properties={MOCK_PROPERTIES} zones={MOCK_DISASTER_ZONES}
              selectedProperty={selectedProperty} onSelectProperty={handleSelectProperty} />
          )}

          {/* Top-left metric overlays */}
          <div className="absolute left-3 top-3 z-[1000] flex flex-wrap gap-2">
            {mode === "maritime" ? (
              <>
                <div className="pointer-events-none">
                  <MetricCard label="Active Vessels" value={String(maritimeStats.active)}
                    sub={`of ${maritimeStats.total} tracked`} color="var(--accent-green)" />
                </div>
                <div className="pointer-events-none">
                  <MetricCard label="Incidents" value={String(maritimeStats.incidents)}
                    sub="active alerts" color="var(--accent-red)" />
                </div>
                {vault && (
                  <div className="pointer-events-none">
                    <MetricCard label="Vault TVL" value={`${Number(vault.tvl).toLocaleString()}`}
                      sub="RLUSD backing coverage" color="var(--accent-cyan)" />
                  </div>
                )}
                {vault && (
                  <div className="pointer-events-none">
                    <MetricCard label="Exposure" value={`${totalExposure.toLocaleString()}`}
                      sub={`${activeVoyages.length} active policies`} color="var(--accent-amber)" />
                  </div>
                )}
                {/* Live premium — from config market; amount from selected vessel; always show a number */}
                <div className="panel p-3 min-w-[160px] pointer-events-none">
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "rgba(200,214,229,0.4)" }}>
                    Live premium
                  </div>
                  <div className="font-mono text-xl font-bold" style={{ color: "var(--accent-amber)" }}>
                    {livePremiumLoading && !livePremiumDisplay ? "…" : livePremiumDisplay ? `${livePremiumDisplay} RLUSD` : "—"}
                  </div>
                  <div className="text-[9px]" style={{ color: "rgba(200,214,229,0.35)" }}>
                    {selectedShip ? `for ${Number(livePremiumAmount).toLocaleString()} RLUSD cover` : "Select a vessel"}
                    {livePremium && livePremium.source === "polymarket" && " · live"}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="pointer-events-none">
                  <MetricCard label="Properties" value={String(disasterStats.total)}
                    sub="insured structures" color="var(--accent-cyan)" />
                </div>
                <div className="pointer-events-none">
                  <MetricCard label="Destroyed/Severe" value={`${disasterStats.destroyed + disasterStats.severe}`}
                    sub={`${disasterStats.destroyed} destroyed`} color="var(--accent-red)" />
                </div>
                <div className="pointer-events-none">
                  <MetricCard label="Claims Paid" value={String(disasterStats.claimed)}
                    sub={`${disasterStats.pending} pending`} color="var(--accent-green)" />
                </div>
              </>
            )}
          </div>
        </main>

        {/* Right Panel */}
        <aside className="flex w-80 flex-col border-l border-panel-border bg-panel/60">
          {/* Maritime mode — ship selected */}
          {mode === "maritime" && role === "exporter" && insuring && selectedShip ? (
            <InsureWizard
              ship={selectedShip}
              wallet={wallet}
              onClose={() => setInsuring(false)}
              onComplete={refreshData}
            />
          ) : mode === "maritime" && role && selectedShip ? (
            <ShipQuickView
              ship={selectedShip}
              vault={vault}
              onInsure={() => setInsuring(true)}
              onViewDetail={() => setDetailShip(selectedShip)}
              onClose={() => setSelectedShip(null)}
              isProvider={role === "provider"}
            />
          ) : mode === "maritime" && role === "exporter" ? (
            <CoverageCenter wallet={wallet} />
          ) : mode === "maritime" && role === "provider" ? (
            <VaultPanel wallet={wallet} openTab={vaultPanelOpenTab} onTabChange={() => setVaultPanelOpenTab(null)} />

          /* Disaster mode — property selected */
          ) : mode === "disaster" && role && selectedProperty ? (
            <PropertyQuickView
              property={selectedProperty}
              vault={vault}
              onViewDetail={() => setDetailProperty(selectedProperty)}
              onClose={() => setSelectedProperty(null)}
              isProvider={role === "provider"}
            />
          ) : mode === "disaster" && role === "exporter" ? (
            <CoverageCenter wallet={wallet} />
          ) : mode === "disaster" && role === "provider" ? (
            <VaultPanel wallet={wallet} openTab={vaultPanelOpenTab} onTabChange={() => setVaultPanelOpenTab(null)} />

          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <div className="text-[10px]" style={{ color: "rgba(200,214,229,0.2)" }}>
                {mode === "maritime" ? "Select a vessel to view details" : "Select a property to view details"}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ===== Ship Quick View (right sidebar) ===== */
function ShipQuickView({ ship, vault, onInsure, onViewDetail, onClose, isProvider }: {
  ship: Ship; vault: VaultData | null; onInsure: () => void; onViewDetail: () => void; onClose: () => void; isProvider?: boolean;
}) {
  const premiumEst = (Number(ship.insuredAmount) * 0.02).toFixed(2);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="panel-header flex items-center justify-between">
        <span>Vessel Intel</span>
        <button onClick={onClose} className="text-foreground/30 hover:text-foreground/60">&times;</button>
      </div>
      <div className="space-y-3 p-3">
        <div>
          <div className="font-mono text-base font-bold" style={{ color: "var(--accent-cyan)" }}>{ship.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
            <span>{ship.imo}</span><span>&middot;</span><span>{ship.flag}</span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className={`badge ${ship.status === "incident" ? "badge-incident" : ship.status === "anchored" ? "badge-pending" : "badge-active"}`}>
            {ship.status}
          </span>
          {ship.policyStatus === "uninsured" ? (
            <span className="badge" style={{ background: "rgba(255,170,0,0.12)", color: "var(--accent-amber)", border: "1px solid rgba(255,170,0,0.2)" }}>
              NEEDS COVERAGE
            </span>
          ) : ship.policyStatus === "active" ? (
            <span className="badge badge-active">INSURED</span>
          ) : (
            <span className="badge badge-expired">{ship.policyStatus}</span>
          )}
        </div>

        {/* Quick stats */}
        <div className="panel p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Route</div>
              <div className="text-xs" style={{ color: "var(--accent-cyan)" }}>{ship.routeName}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Speed</div>
              <div className="font-mono text-sm font-bold">{ship.speed} kn</div>
            </div>
            <div>
              <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Insured Amount</div>
              <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-cyan)" }}>
                {Number(ship.insuredAmount).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Premium</div>
              <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-amber)" }}>
                {premiumEst}
              </div>
            </div>
          </div>
        </div>

        {/* Balance check for exporter */}
        {!isProvider && vault && (
          <div className="flex items-center justify-between rounded border p-2.5"
            style={{ borderColor: "var(--panel-border)", background: "rgba(0,0,0,0.2)" }}>
            <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>Your RLUSD</span>
            <span className="font-mono text-sm font-bold"
              style={{ color: Number(vault.userRlusd) >= Number(premiumEst) ? "var(--accent-green)" : "var(--accent-red)" }}>
              {Number(vault.userRlusd).toLocaleString()}
            </span>
          </div>
        )}

        {/* Vault backing for provider */}
        {isProvider && vault && (
          <div className="panel p-3">
            <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>
              Vault Backing
            </div>
            <div className="mt-1 font-mono text-base font-bold" style={{ color: "var(--accent-cyan)" }}>
              {Number(vault.tvl).toLocaleString()} RLUSD TVL
            </div>
            <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>
              Your deposits help back this and all other active policies
            </div>
          </div>
        )}

        {/* View Full Details button */}
        <button onClick={onViewDetail}
          className="btn btn-cyan w-full py-2.5 text-[11px]">
          View Full Policy Details &rarr;
        </button>

        {/* Claim settled info box */}
        {ship.policyStatus === "claim_paid" && (
          <div className="rounded border p-3 text-center"
            style={{ borderColor: "rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.04)" }}>
            <div className="text-[11px] font-semibold" style={{ color: "var(--accent-green)" }}>Claim Settled</div>
            <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
              This vessel&apos;s claim has been paid out. No further coverage actions available.
            </div>
          </div>
        )}

        {/* Insure CTA for exporter */}
        {!isProvider && ship.policyStatus !== "claim_paid" && (ship.policyStatus === "active" || ship.policyStatus === "uninsured") && (
          <button onClick={onInsure}
            className="btn btn-green w-full py-2.5 text-[11px]"
            style={{ letterSpacing: "0.05em" }}>
            {ship.policyStatus === "uninsured" ? "Purchase Coverage" : "Get Quote"} &rarr;
          </button>
        )}

        {/* Quick terms */}
        <div className="rounded border p-2 text-[10px] leading-relaxed"
          style={{ borderColor: "rgba(0,212,255,0.08)", background: "rgba(0,212,255,0.02)", color: "rgba(200,214,229,0.35)" }}>
          <div className="mb-1 text-[9px] font-semibold uppercase" style={{ color: "var(--accent-cyan)" }}>Quick Terms</div>
          <div>Parametric &middot; 2% premium &middot; 100% payout on incident &middot; Instant settlement &middot; NFT proof</div>
        </div>
      </div>
    </div>
  );
}

/* ===== Property Quick View (right sidebar) ===== */
function PropertyQuickView({ property, vault, onViewDetail, onClose, isProvider }: {
  property: Property; vault: VaultData | null; onViewDetail: () => void; onClose: () => void; isProvider?: boolean;
}) {
  const damageColors: Record<string, string> = { none: "var(--accent-green)", minor: "var(--accent-amber)", moderate: "#ff8800", severe: "var(--accent-red)", destroyed: "#cc0033" };
  const damagePercent: Record<string, number> = { none: 0, minor: 20, moderate: 50, severe: 80, destroyed: 100 };
  const premiumEst = (Number(property.insuredAmount) * 0.02).toFixed(2);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="panel-header flex items-center justify-between">
        <span>Property Intel</span>
        <button onClick={onClose} className="text-foreground/30 hover:text-foreground/60">&times;</button>
      </div>
      <div className="space-y-3 p-3">
        <div>
          <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-cyan)" }}>{property.address}</div>
          <div className="mt-0.5 text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
            {property.id} &middot; Owner: {property.owner.slice(0, 8)}...
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          <span className="badge" style={{
            background: `color-mix(in srgb, ${damageColors[property.damageLevel]} 12%, transparent)`,
            color: damageColors[property.damageLevel],
            border: `1px solid color-mix(in srgb, ${damageColors[property.damageLevel]} 30%, transparent)`,
          }}>
            {property.damageLevel}
          </span>
          {property.policyStatus === "uninsured" ? (
            <span className="badge" style={{ background: "rgba(255,170,0,0.12)", color: "var(--accent-amber)", border: "1px solid rgba(255,170,0,0.2)" }}>
              NEEDS COVERAGE
            </span>
          ) : property.policyStatus === "active" ? (
            <span className="badge badge-active">INSURED</span>
          ) : (
            <span className="badge badge-expired">{property.policyStatus}</span>
          )}
          {property.claimStatus === "pending" && <span className="badge badge-pending">CLAIM PENDING</span>}
        </div>

        {/* Damage bar */}
        <div className={`panel p-3 ${damagePercent[property.damageLevel] > 50 ? "glow-red" : ""}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Damage Level</span>
            <span className="font-mono text-sm font-bold" style={{ color: damageColors[property.damageLevel] }}>
              {damagePercent[property.damageLevel]}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-sm" style={{ background: "rgba(200,214,229,0.05)" }}>
            <div className="h-full transition-all duration-500" style={{
              width: `${damagePercent[property.damageLevel]}%`,
              background: damageColors[property.damageLevel], opacity: 0.7,
            }} />
          </div>
        </div>

        {/* Financials */}
        <div className="panel p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Insured Amount</div>
              <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-cyan)" }}>
                {Number(property.insuredAmount).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase" style={{ color: "rgba(200,214,229,0.3)" }}>Premium</div>
              <div className="font-mono text-sm font-bold" style={{ color: "var(--accent-amber)" }}>
                {premiumEst}
              </div>
            </div>
          </div>
        </div>

        {/* Balance / Vault */}
        {!isProvider && vault && (
          <div className="flex items-center justify-between rounded border p-2.5"
            style={{ borderColor: "var(--panel-border)", background: "rgba(0,0,0,0.2)" }}>
            <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>Your RLUSD</span>
            <span className="font-mono text-sm font-bold"
              style={{ color: Number(vault.userRlusd) >= Number(premiumEst) ? "var(--accent-green)" : "var(--accent-red)" }}>
              {Number(vault.userRlusd).toLocaleString()}
            </span>
          </div>
        )}
        {isProvider && vault && (
          <div className="panel p-3">
            <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>
              Vault Backing
            </div>
            <div className="mt-1 font-mono text-base font-bold" style={{ color: "var(--accent-cyan)" }}>
              {Number(vault.tvl).toLocaleString()} RLUSD TVL
            </div>
          </div>
        )}

        {/* Coverage resolved info box */}
        {(property.claimStatus === "claim_paid" || property.policyStatus === "expired") && (
          <div className="rounded border p-3 text-center"
            style={{ borderColor: "rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.04)" }}>
            <div className="text-[11px] font-semibold" style={{ color: "var(--accent-green)" }}>
              {property.claimStatus === "claim_paid" ? "Claim Settled" : "Coverage Expired"}
            </div>
            <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
              {property.claimStatus === "claim_paid"
                ? "This property\u2019s claim has been paid out. No further coverage actions available."
                : "Coverage for this property has expired."}
            </div>
          </div>
        )}

        {/* View Full Details */}
        <button onClick={onViewDetail}
          className="btn btn-cyan w-full py-2.5 text-[11px]">
          View Full Policy Details &rarr;
        </button>

        {/* Quick terms */}
        <div className="rounded border p-2 text-[10px] leading-relaxed"
          style={{ borderColor: "rgba(0,212,255,0.08)", background: "rgba(0,212,255,0.02)", color: "rgba(200,214,229,0.35)" }}>
          <div className="mb-1 text-[9px] font-semibold uppercase" style={{ color: "var(--accent-cyan)" }}>Quick Terms</div>
          <div>Parametric &middot; 2% premium &middot; 100% payout on disaster &middot; Instant settlement &middot; NFT proof</div>
        </div>
      </div>
    </div>
  );
}
