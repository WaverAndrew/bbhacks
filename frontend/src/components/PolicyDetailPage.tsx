"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { Ship, VaultData, Role } from "@/lib/types";

type Props = {
  ship: Ship;
  role: Role;
  wallet: string;
  onClose: () => void;
  onInsure: () => void;
  onDeposit: () => void;
};

export default function PolicyDetailPage({ ship, role, wallet, onClose, onInsure, onDeposit }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [vault, setVault] = useState<VaultData | null>(null);

  useEffect(() => {
    api.lp.vault(wallet).then((d: any) => setVault(d)).catch(() => {});
  }, [wallet]);

  // Render mini leaflet map
  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    let cancelled = false;

    import("leaflet").then((leaflet) => {
      const L = leaflet.default;
      if (cancelled || !mapRef.current) return;

      // Remove existing map if any (e.g. from prior run or Strict Mode)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      // Leaflet may have left _leaflet_id on the container; use a fresh container by clearing it
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }

      const map = L.map(container, {
        center: ship.position,
        zoom: 6,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: true,
      });
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Route line
      if (ship.path.length > 1) {
        // Already traveled (start to ship position)
        const shipIdx = findClosestIdx(ship.path, ship.position);
        const traveled = ship.path.slice(0, shipIdx + 1);
        const planned = ship.path.slice(shipIdx);

        if (traveled.length > 1) {
          L.polyline(traveled as [number, number][], {
            color: "#00ff88",
            weight: 2.5,
            opacity: 0.7,
          }).addTo(map);
        }
        if (planned.length > 1) {
          L.polyline(planned as [number, number][], {
            color: "#00d4ff",
            weight: 2,
            opacity: 0.4,
            dashArray: "8,6",
          }).addTo(map);
        }

        // Waypoint dots
        ship.path.forEach((pt, i) => {
          const isStart = i === 0;
          const isEnd = i === ship.path.length - 1;
          L.circleMarker(pt as [number, number], {
            radius: isStart || isEnd ? 5 : 2.5,
            color: isStart ? "#00ff88" : isEnd ? "#ffaa00" : "#00d4ff",
            fillColor: isStart ? "#00ff88" : isEnd ? "#ffaa00" : "#00d4ff",
            fillOpacity: isStart || isEnd ? 0.8 : 0.4,
            weight: isStart || isEnd ? 2 : 1,
          }).addTo(map);
        });
      }

      // Ship marker
      const statusColor = ship.status === "incident" ? "#ff3366" : ship.status === "anchored" ? "#ffaa00" : "#00ff88";
      const icon = L.divIcon({
        html: `<svg width="24" height="24" viewBox="0 0 24 24" style="transform:rotate(${ship.heading}deg)">
          <polygon points="12,2 6,20 12,16 18,20" fill="${statusColor}" opacity="0.9" stroke="${statusColor}" stroke-width="0.5"/>
        </svg>`,
        className: "",
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker(ship.position as [number, number], { icon }).addTo(map);

      // Fit bounds to route
      if (ship.path.length > 1) {
        const bounds = L.latLngBounds(ship.path as [number, number][]);
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    });

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [ship]);

  const premiumEst = (Number(ship.insuredAmount) * 0.02).toFixed(2);
  const displayPremium = ship.premium && !Number.isNaN(Number(ship.premium)) ? ship.premium : premiumEst;
  const tvl = vault ? Number(vault.tvl) : 0;
  const coverageRatio = tvl > 0 ? ((Number(ship.insuredAmount) / tvl) * 100).toFixed(1) : "—";

  // Calculate route distance (rough great-circle)
  const routeDistanceNm = ship.path.length > 1
    ? ship.path.reduce((sum, pt, i) => {
        if (i === 0) return 0;
        const prev = ship.path[i - 1];
        const dlat = (pt[0] - prev[0]) * 60;
        const dlng = (pt[1] - prev[1]) * 60 * Math.cos(((pt[0] + prev[0]) / 2) * Math.PI / 180);
        return sum + Math.sqrt(dlat * dlat + dlng * dlng);
      }, 0).toFixed(0)
    : "—";

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
            <span className={`badge ${ship.status === "incident" ? "badge-incident" : ship.status === "anchored" ? "badge-pending" : "badge-active"}`}>
              {ship.status}
            </span>
            <span className="font-mono text-sm font-bold" style={{ color: "var(--accent-cyan)" }}>{ship.name}</span>
            <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>{ship.imo}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {ship.policyStatus === "claim_paid" ? (
            <div className="rounded border px-4 py-2"
              style={{ borderColor: "rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.04)" }}>
              <span className="text-[11px] font-semibold" style={{ color: "var(--accent-green)" }}>Claim Settled</span>
            </div>
          ) : (
            <>
              {role === "exporter" && ship.policyStatus === "active" && (
                <button onClick={onInsure} className="btn btn-green py-2 px-5 text-[11px]">
                  Purchase This Coverage &rarr;
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

        {/* Left: Route Map + Vessel */}
        <div className="flex w-1/2 flex-col border-r border-panel-border">
          {/* Mini map */}
          <div ref={mapRef} className="h-[55%] w-full" style={{ background: "#1a1a2e" }} />

          {/* Vessel Details */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="mb-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.4)" }}>
              Vessel &amp; Voyage Information
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InfoCell label="Vessel Name" value={ship.name} color="var(--accent-cyan)" />
              <InfoCell label="IMO Number" value={ship.imo} />
              <InfoCell label="Flag State" value={ship.flag} />
              <InfoCell label="Route" value={ship.routeName} color="var(--accent-cyan)" />
              <InfoCell label="Distance" value={`~${routeDistanceNm} nm`} />
              <InfoCell label="Current Speed" value={`${ship.speed} kn`} color={ship.speed === 0 ? "var(--accent-red)" : "var(--accent-green)"} />
              <InfoCell label="Heading" value={`${ship.heading}°`} />
              <InfoCell label="Position" value={`${ship.position[0].toFixed(3)}°N, ${ship.position[1].toFixed(3)}°E`} />
              <InfoCell label="Cargo" value={ship.cargo} />
            </div>

            {/* Route visualization legend */}
            <div className="mt-4 flex items-center gap-4 text-[10px]" style={{ color: "rgba(200,214,229,0.35)" }}>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-5" style={{ background: "#00ff88" }} />
                <span>Traveled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-5" style={{ background: "#00d4ff", borderBottom: "1px dashed #00d4ff" }} />
                <span>Planned route</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#00ff88" }} />
                <span>Origin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#ffaa00" }} />
                <span>Destination</span>
              </div>
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
                  {Number(ship.insuredAmount).toLocaleString()}
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
                <div className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>Coverage / TVL</div>
                <div className="mt-1 font-mono text-2xl font-bold" style={{ color: Number(coverageRatio) > 50 ? "var(--accent-red)" : "var(--foreground)" }}>
                  {coverageRatio}%
                </div>
                <div className="text-[10px]" style={{ color: "rgba(200,214,229,0.3)" }}>vault utilization for this policy</div>
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
              <ConditionRow label="Coverage Type" value="Parametric Marine Cargo" />
              <ConditionRow label="Premium Rate" value="2% of insured amount (flat)" />
              <ConditionRow label="Coverage Period" value="Custom — default 30 days from binding" />
              <ConditionRow label="Payout Trigger" value="Oracle-confirmed maritime incident on this voyage" />
              <ConditionRow label="Payout Amount" value={`100% of insured = ${Number(ship.insuredAmount).toLocaleString()} RLUSD`} highlight />
              <ConditionRow label="Settlement" value="Instant — XRPL Payment tx from Vault to policyholder" />
              <ConditionRow label="Proof of Policy" value="XLS-20 NFT minted to your XRPL wallet" />
              <ConditionRow label="Policy Expiry" value="Auto-expires at end date if no incident — NFT burned" />
              <ConditionRow label="Claim Process" value="None — parametric payout is automatic, no paperwork" />
              <ConditionRow label="Backed By" value={`RLUSD Vault (${tvl.toLocaleString()} RLUSD TVL) — on-chain transparent`} />
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
                <FlowStep n={4} label="Policy Active" desc={`Coverage active for voyage ${ship.voyageId}. NFT = your policy.`} status="green" />
                <div className="border-t border-panel-border pt-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.35)" }}>
                    Resolution Scenarios
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div className="rounded border p-2.5"
                      style={{ borderColor: "rgba(255,51,102,0.2)", background: "rgba(255,51,102,0.03)" }}>
                      <div className="text-[10px] font-bold" style={{ color: "var(--accent-red)" }}>Incident Occurs</div>
                      <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.45)" }}>
                        Oracle triggers payout &rarr; Vault sends {Number(ship.insuredAmount).toLocaleString()} RLUSD to you &rarr; NFT burned
                      </div>
                    </div>
                    <div className="rounded border p-2.5"
                      style={{ borderColor: "rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.03)" }}>
                      <div className="text-[10px] font-bold" style={{ color: "var(--accent-green)" }}>No Incident</div>
                      <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.45)" }}>
                        Policy expires &rarr; Premium stays in vault (LP yield) &rarr; NFT burned
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* For Provider: Risk Analysis */}
          {role === "provider" && (
            <div className="mb-5">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--accent-green)" }}>
                Risk Analysis for LPs
              </div>
              <div className="panel p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "rgba(200,214,229,0.5)" }}>Premium earned if no incident</span>
                    <span className="font-mono font-bold" style={{ color: "var(--accent-green)" }}>+{displayPremium} RLUSD</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "rgba(200,214,229,0.5)" }}>Max loss if incident</span>
                    <span className="font-mono font-bold" style={{ color: "var(--accent-red)" }}>-{Number(ship.insuredAmount).toLocaleString()} RLUSD</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "rgba(200,214,229,0.5)" }}>Risk corridor</span>
                    <span className="font-mono font-bold" style={{ color: "var(--accent-cyan)" }}>{ship.routeName}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "rgba(200,214,229,0.5)" }}>Vessel status</span>
                    <span className={`badge ${ship.status === "incident" ? "badge-incident" : ship.status === "anchored" ? "badge-pending" : "badge-active"}`}>
                      {ship.status}
                    </span>
                  </div>
                  <div className="mt-2 rounded border p-2 text-[10px]"
                    style={{ borderColor: "rgba(0,212,255,0.1)", background: "rgba(0,212,255,0.02)", color: "rgba(200,214,229,0.4)" }}>
                    Your deposit into the vault collectively backs <strong>all</strong> active policies. The vault&apos;s diversified risk means
                    a single incident doesn&apos;t wipe out your position — only the insured amount for that voyage is paid out.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="mt-auto pt-4">
            {ship.policyStatus === "claim_paid" ? (
              <div className="rounded border p-4 text-center"
                style={{ borderColor: "rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.04)" }}>
                <div className="text-[11px] font-semibold" style={{ color: "var(--accent-green)" }}>Claim Settled</div>
                <div className="mt-1 text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
                  This vessel&apos;s claim has been paid out. No further coverage actions available.
                </div>
              </div>
            ) : (
              <>
                {role === "exporter" && ship.policyStatus === "active" && (
                  <button onClick={onInsure} className="btn btn-green w-full py-3 text-xs" style={{ letterSpacing: "0.08em" }}>
                    Purchase Coverage for {displayPremium} RLUSD &rarr;
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
      <div className="mt-0.5 text-[11px] font-mono" style={{ color: color ?? "rgba(200,214,229,0.7)" }}>{value}</div>
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

function findClosestIdx(path: [number, number][], pos: [number, number]): number {
  let minDist = Infinity;
  let idx = 0;
  path.forEach((pt, i) => {
    const d = Math.sqrt((pt[0] - pos[0]) ** 2 + (pt[1] - pos[1]) ** 2);
    if (d < minDist) { minDist = d; idx = i; }
  });
  return idx;
}
