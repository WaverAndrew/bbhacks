"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Property, DisasterZone, VaultData, Role } from "@/lib/types";
import { MOCK_DISASTER_ZONES } from "@/lib/mock-data";

const DAMAGE_COLORS: Record<string, string> = {
  none: "#00ff88", minor: "#ffaa00", moderate: "#ff8800", severe: "#ff3366", destroyed: "#cc0033",
};
const DAMAGE_PERCENT: Record<string, number> = {
  none: 0, minor: 20, moderate: 50, severe: 80, destroyed: 100,
};
const DAMAGE_DESCRIPTIONS: Record<string, string> = {
  none: "No visible damage. Structure intact.",
  minor: "Cosmetic damage — broken windows, minor roof damage.",
  moderate: "Structural stress — partial roof loss, wall cracks.",
  severe: "Major structural damage — partial collapse, uninhabitable.",
  destroyed: "Total loss — structure collapsed or washed away.",
};

type Props = {
  property: Property;
  role: Role;
  wallet: string;
  onClose: () => void;
  onInsure: () => void;
  onDeposit: () => void;
};

export default function PropertyDetailPage({ property, role, wallet, onClose, onInsure, onDeposit }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [vault, setVault] = useState<VaultData | null>(null);

  useEffect(() => {
    api.lp.vault(wallet).then((d: any) => setVault(d)).catch(() => {});
  }, [wallet]);

  // Render mini leaflet map
  useEffect(() => {
    if (!mapRef.current) return;
    let map: any = null;

    import("leaflet").then((leaflet) => {
      const L = leaflet.default;
      if (!mapRef.current) return;

      map = L.map(mapRef.current, {
        center: property.position,
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Draw disaster zones
      MOCK_DISASTER_ZONES.forEach((z) => {
        const severityColors: Record<string, string> = {
          low: "rgba(255,170,0,0.08)", medium: "rgba(255,136,0,0.12)",
          high: "rgba(255,51,102,0.15)", critical: "rgba(204,0,51,0.2)",
        };
        const severityBorders: Record<string, string> = {
          low: "rgba(255,170,0,0.3)", medium: "rgba(255,136,0,0.4)",
          high: "rgba(255,51,102,0.5)", critical: "rgba(204,0,51,0.6)",
        };
        L.circle(z.center as [number, number], {
          radius: z.radius,
          color: severityBorders[z.severity],
          fillColor: severityColors[z.severity],
          fillOpacity: 1,
          weight: 1,
          dashArray: "6,4",
        }).addTo(map);
      });

      // Property marker
      const color = DAMAGE_COLORS[property.damageLevel] ?? "#00d4ff";
      const icon = L.divIcon({
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `
          <div style="position:relative;width:28px;height:28px;">
            <div style="position:absolute;inset:0;background:${color};opacity:0.2;border-radius:3px;transform:rotate(45deg);"></div>
            <div style="position:absolute;inset:4px;background:${color};opacity:0.8;border-radius:2px;transform:rotate(45deg);border:2px solid ${color};"></div>
            <div style="position:absolute;inset:0;border:2px solid ${color};border-radius:3px;transform:rotate(45deg);animation:ship-pulse 2s ease-in-out infinite;"></div>
          </div>
        `,
      });
      L.marker(property.position as [number, number], { icon }).addTo(map);

      // Radius ring around property
      L.circle(property.position as [number, number], {
        radius: 200,
        color,
        fillColor: color,
        fillOpacity: 0.05,
        weight: 1,
        dashArray: "4,4",
      }).addTo(map);
    });

    return () => { if (map) map.remove(); };
  }, [property]);

  const premiumEst = (Number(property.insuredAmount) * 0.02).toFixed(2);
  const displayPremium = property.premium && !Number.isNaN(Number(property.premium)) ? property.premium : premiumEst;
  const tvl = vault ? Number(vault.tvl) : 0;
  const coverageRatio = tvl > 0 ? ((Number(property.insuredAmount) / tvl) * 100).toFixed(1) : "—";
  const isOpen = property.policyStatus === "active" || property.policyStatus === "uninsured";
  const isPaid = property.claimStatus === "claim_paid";

  // Find which disaster zone this property is in
  const nearestZone = MOCK_DISASTER_ZONES.reduce<DisasterZone | null>((best, z) => {
    const d = Math.sqrt((z.center[0] - property.position[0]) ** 2 + (z.center[1] - property.position[1]) ** 2);
    const dBest = best ? Math.sqrt((best.center[0] - property.position[0]) ** 2 + (best.center[1] - property.position[1]) ** 2) : Infinity;
    return d < dBest ? z : best;
  }, null);

  return (
    <div className="absolute inset-0 z-[2000] flex flex-col overflow-hidden"
      style={{ background: "rgba(10,15,26,0.97)", backdropFilter: "blur(12px)" }}>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-panel-border px-6 py-3">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider transition hover:opacity-80"
            style={{ color: "var(--accent-cyan)" }}>
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Dashboard
          </button>
          <div className="h-4 w-px" style={{ background: "var(--panel-border)" }} />
          <div className="flex items-center gap-2">
            <span className="badge" style={{
              background: `color-mix(in srgb, ${DAMAGE_COLORS[property.damageLevel]} 12%, transparent)`,
              color: DAMAGE_COLORS[property.damageLevel],
              border: `1px solid color-mix(in srgb, ${DAMAGE_COLORS[property.damageLevel]} 30%, transparent)`,
            }}>
              {property.damageLevel}
            </span>
            {property.policyStatus === "uninsured" && (
              <span className="badge" style={{ background: "rgba(255,170,0,0.12)", color: "var(--accent-amber)", border: "1px solid rgba(255,170,0,0.2)" }}>
                NEEDS COVERAGE
              </span>
            )}
            {isPaid && <span className="badge badge-active">CLAIM PAID</span>}
            {property.claimStatus === "pending" && <span className="badge badge-pending">CLAIM PENDING</span>}
            <span className="font-mono text-sm font-bold" style={{ color: "var(--accent-cyan)" }}>{property.address}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(isPaid || property.policyStatus === "expired") ? (
            <div className="rounded border px-4 py-2"
              style={{ borderColor: "rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.04)" }}>
              <span className="text-[11px] font-semibold" style={{ color: "var(--accent-green)" }}>
                {isPaid ? "Claim Settled" : "Coverage Expired"}
              </span>
            </div>
          ) : (
            <>
              {role === "exporter" && isOpen && (
                <button onClick={onInsure} className="btn btn-green py-2 px-5 text-[11px]">
                  {property.policyStatus === "uninsured" ? "Purchase Coverage" : "View My Policy"} &rarr;
                </button>
              )}
              {role === "provider" && (
                <button onClick={onDeposit} className="btn btn-cyan py-2 px-5 text-[11px]">
                  Deposit to Back Coverage &rarr;
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body — two columns */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Map + Property Info */}
        <div className="flex w-1/2 flex-col border-r border-panel-border">
          <div ref={mapRef} className="h-[50%] w-full" style={{ background: "#1a1a2e" }} />

          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.4)" }}>
              Property &amp; Damage Assessment
            </div>

            {/* Damage bar */}
            <div className="mb-4 panel p-4" style={{
              boxShadow: DAMAGE_PERCENT[property.damageLevel] > 50
                ? `0 0 20px color-mix(in srgb, ${DAMAGE_COLORS[property.damageLevel]} 15%, transparent)`
                : "none",
            }}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-2xl font-bold uppercase" style={{ color: DAMAGE_COLORS[property.damageLevel] }}>
                  {property.damageLevel}
                </span>
                <span className="font-mono text-xl font-bold" style={{ color: DAMAGE_COLORS[property.damageLevel] }}>
                  {DAMAGE_PERCENT[property.damageLevel]}%
                </span>
              </div>
              <div className="mt-2 h-3 w-full overflow-hidden rounded-sm" style={{ background: "rgba(200,214,229,0.05)" }}>
                <div className="h-full transition-all duration-700"
                  style={{
                    width: `${DAMAGE_PERCENT[property.damageLevel]}%`,
                    background: `linear-gradient(90deg, ${DAMAGE_COLORS[property.damageLevel]}88, ${DAMAGE_COLORS[property.damageLevel]})`,
                  }} />
              </div>
              <div className="mt-2 text-[10px]" style={{ color: "rgba(200,214,229,0.45)" }}>
                {DAMAGE_DESCRIPTIONS[property.damageLevel]}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <InfoCell label="Property ID" value={property.id} />
              <InfoCell label="Address" value={property.address} color="var(--accent-cyan)" />
              <InfoCell label="Owner" value={`${property.owner.slice(0, 8)}...`} />
              <InfoCell label="Position" value={`${property.position[0].toFixed(4)}°N, ${property.position[1].toFixed(4)}°W`} />
              {nearestZone && (
                <>
                  <InfoCell label="Disaster Zone" value={nearestZone.name} color="var(--accent-red)" />
                  <InfoCell label="Zone Severity" value={nearestZone.severity.toUpperCase()} color={
                    nearestZone.severity === "critical" ? "#cc0033" : nearestZone.severity === "high" ? "var(--accent-red)" : "var(--accent-amber)"
                  } />
                </>
              )}
            </div>

            {/* Map legend */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>
              {Object.entries(DAMAGE_COLORS).map(([level, color]) => (
                <div key={level} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rotate-45 rounded-sm" style={{ background: color }} />
                  <span className="capitalize">{level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Policy Conditions & Financials */}
        <div className="flex w-1/2 flex-col overflow-y-auto p-5">

          {/* Coverage Financials */}
          <div className="mb-5">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.4)" }}>
              Coverage Financials
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="panel p-4">
                <div className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Insured Amount</div>
                <div className="mt-1 font-mono text-2xl font-bold" style={{ color: "var(--accent-cyan)" }}>
                  {Number(property.insuredAmount).toLocaleString()}
                </div>
                <div className="text-[10px]" style={{ color: "rgba(200,214,229,0.3)" }}>RLUSD</div>
              </div>
              <div className="panel p-4">
                <div className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Premium Cost</div>
                <div className="mt-1 font-mono text-2xl font-bold" style={{ color: "var(--accent-amber)" }}>
                  {displayPremium}
                </div>
                <div className="text-[10px]" style={{ color: "rgba(200,214,229,0.3)" }}>RLUSD</div>
              </div>
              <div className="panel p-4">
                <div className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Vault TVL (backing)</div>
                <div className="mt-1 font-mono text-2xl font-bold" style={{ color: "var(--accent-green)" }}>
                  {tvl.toLocaleString()}
                </div>
                <div className="text-[10px]" style={{ color: "rgba(200,214,229,0.3)" }}>RLUSD in vault</div>
              </div>
              <div className="panel p-4">
                <div className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Claim Status</div>
                <div className="mt-1">
                  {isPaid ? (
                    <span className="font-mono text-xl font-bold" style={{ color: "var(--accent-green)" }}>PAID</span>
                  ) : property.claimStatus === "pending" ? (
                    <span className="font-mono text-xl font-bold" style={{ color: "var(--accent-amber)" }}>PENDING</span>
                  ) : (
                    <span className="font-mono text-xl font-bold" style={{ color: "rgba(200,214,229,0.4)" }}>—</span>
                  )}
                </div>
                <div className="text-[10px]" style={{ color: "rgba(200,214,229,0.3)" }}>
                  {isPaid ? "Payout complete" : property.claimStatus === "pending" ? "Awaiting oracle confirmation" : "No claim filed"}
                </div>
              </div>
            </div>

            {role === "exporter" && vault && (
              <div className="mt-3 flex items-center justify-between rounded border p-3"
                style={{ borderColor: "var(--panel-border)", background: "rgba(0,0,0,0.2)" }}>
                <span className="text-[11px]" style={{ color: "rgba(200,214,229,0.5)" }}>Your RLUSD Balance</span>
                <span className="font-mono text-base font-bold"
                  style={{ color: Number(vault.userRlusd) >= Number(displayPremium) ? "var(--accent-green)" : "var(--accent-red)" }}>
                  {Number(vault.userRlusd).toLocaleString()} RLUSD
                </span>
              </div>
            )}
          </div>

          {/* Policy Conditions */}
          <div className="mb-5">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.4)" }}>
              Policy Conditions
            </div>
            <div className="space-y-2">
              <ConditionRow label="Coverage Type" value="Parametric Disaster Relief" />
              <ConditionRow label="Premium Rate" value="2% of insured amount (flat)" />
              <ConditionRow label="Coverage Period" value="Custom — default 30 days from binding" />
              <ConditionRow label="Payout Trigger" value="Oracle-confirmed damage assessment (moderate+)" />
              <ConditionRow label="Payout Amount" value={`100% of insured = ${Number(property.insuredAmount).toLocaleString()} RLUSD`} highlight />
              <ConditionRow label="Settlement" value="Instant — XRPL Payment tx from Vault to policyholder" />
              <ConditionRow label="Proof of Policy" value="XLS-20 NFT minted to your XRPL wallet" />
              <ConditionRow label="Damage Oracle" value="Satellite imagery + ground assessment → on-chain report" />
              <ConditionRow label="Claim Process" value="Automatic — parametric payout on oracle confirmation" />
              <ConditionRow label="Backed By" value={`RLUSD Vault (${tvl.toLocaleString()} RLUSD TVL)`} />
            </div>
          </div>

          {/* XRPL On-Chain Flow */}
          <div className="mb-5">
            <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-cyan)" }}>
              On-Chain XRPL Flow
            </div>
            <div className="panel p-4">
              <div className="space-y-3">
                <FlowStep n={1} label="Quote" desc="Off-chain premium calculation: 2% × insured amount" status="info" />
                <FlowStep n={2} label="Payment Tx" desc={`XRPL Payment: ${displayPremium} RLUSD from your wallet → Vault address`} status="amber" />
                <FlowStep n={3} label="NFTokenMint Tx" desc="XLS-20 NFT minted to your wallet as proof of coverage" status="green" />
                <FlowStep n={4} label="Policy Active" desc={`Coverage active for property ${property.id}. NFT = your policy.`} status="green" />
                <div className="border-t border-panel-border pt-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>
                    Resolution Scenarios
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div className="rounded border p-2.5"
                      style={{ borderColor: "rgba(255,51,102,0.2)", background: "rgba(255,51,102,0.03)" }}>
                      <div className="text-[10px] font-bold" style={{ color: "var(--accent-red)" }}>Disaster Confirmed</div>
                      <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.45)" }}>
                        Oracle confirms damage &rarr; Vault sends {Number(property.insuredAmount).toLocaleString()} RLUSD &rarr; NFT burned
                      </div>
                    </div>
                    <div className="rounded border p-2.5"
                      style={{ borderColor: "rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.03)" }}>
                      <div className="text-[10px] font-bold" style={{ color: "var(--accent-green)" }}>No Damage</div>
                      <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.45)" }}>
                        Policy expires &rarr; Premium stays in vault (LP yield) &rarr; NFT burned
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Provider risk analysis */}
          {role === "provider" && (
            <div className="mb-5">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-green)" }}>
                Risk Analysis for LPs
              </div>
              <div className="panel p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "rgba(200,214,229,0.5)" }}>Premium earned if no claim</span>
                    <span className="font-mono font-bold" style={{ color: "var(--accent-green)" }}>+{displayPremium} RLUSD</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "rgba(200,214,229,0.5)" }}>Max loss if claim</span>
                    <span className="font-mono font-bold" style={{ color: "var(--accent-red)" }}>-{Number(property.insuredAmount).toLocaleString()} RLUSD</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "rgba(200,214,229,0.5)" }}>Current damage level</span>
                    <span className="font-mono font-bold" style={{ color: DAMAGE_COLORS[property.damageLevel] }}>
                      {property.damageLevel.toUpperCase()} ({DAMAGE_PERCENT[property.damageLevel]}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "rgba(200,214,229,0.5)" }}>Coverage / TVL</span>
                    <span className="font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>{coverageRatio}%</span>
                  </div>
                  <div className="mt-2 rounded border p-2 text-[10px]"
                    style={{ borderColor: "rgba(0,212,255,0.1)", background: "rgba(0,212,255,0.02)", color: "rgba(200,214,229,0.4)" }}>
                    Your deposit collectively backs all active policies. Diversified risk across multiple properties
                    and disaster zones reduces the impact of any single claim.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="mt-auto pt-4">
            {(isPaid || property.policyStatus === "expired") ? (
              <div className="rounded border p-4 text-center"
                style={{ borderColor: "rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.04)" }}>
                <div className="text-[11px] font-semibold" style={{ color: "var(--accent-green)" }}>
                  {isPaid ? "Claim Settled" : "Coverage Expired"}
                </div>
                <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
                  {isPaid
                    ? "This property\u2019s claim has been paid out. No further coverage actions available."
                    : "Coverage for this property has expired."}
                </div>
              </div>
            ) : (
              <>
                {role === "exporter" && isOpen && (
                  <button onClick={onInsure} className="btn btn-green w-full py-3 text-xs" style={{ letterSpacing: "0.08em" }}>
                    {property.policyStatus === "uninsured" ? "Purchase Coverage" : "View My Policy"} for {displayPremium} RLUSD &rarr;
                  </button>
                )}
                {role === "provider" && (
                  <button onClick={onDeposit} className="btn btn-cyan w-full py-3 text-xs" style={{ letterSpacing: "0.08em" }}>
                    Deposit RLUSD to Back This &amp; Other Policies &rarr;
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.3)" }}>{label}</div>
      <div className="mt-0.5 font-mono text-[11px]" style={{ color: color ?? "rgba(200,214,229,0.7)" }}>{value}</div>
    </div>
  );
}

function ConditionRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded border px-3 py-2"
      style={{
        borderColor: highlight ? "rgba(0,255,136,0.15)" : "var(--panel-border)",
        background: highlight ? "rgba(0,255,136,0.03)" : "transparent",
      }}>
      <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: "rgba(200,214,229,0.4)", minWidth: 120 }}>{label}</span>
      <span className="text-right text-[10px]"
        style={{ color: highlight ? "var(--accent-green)" : "rgba(200,214,229,0.6)" }}>{value}</span>
    </div>
  );
}

function FlowStep({ n, label, desc, status }: { n: number; label: string; desc: string; status: "info" | "amber" | "green" }) {
  const colors = { info: "var(--accent-cyan)", amber: "var(--accent-amber)", green: "var(--accent-green)" };
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
        style={{ background: `color-mix(in srgb, ${colors[status]} 12%, transparent)`, color: colors[status], border: `1px solid color-mix(in srgb, ${colors[status]} 30%, transparent)` }}>
        {n}
      </div>
      <div>
        <div className="text-[11px] font-semibold" style={{ color: colors[status] }}>{label}</div>
        <div className="text-[10px]" style={{ color: "rgba(200,214,229,0.45)" }}>{desc}</div>
      </div>
    </div>
  );
}
