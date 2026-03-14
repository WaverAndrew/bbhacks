"use client";

import { useState } from "react";
import type { Role, Voyage, Policy } from "@/lib/types";

type Props = {
  role: Role;
  voyages: Voyage[];
  policies: Policy[];
};

export default function BottomPanel({ role, voyages, policies }: Props) {
  const [open, setOpen] = useState(false);
  const count = role === "exporter" ? policies.length : voyages.length;
  const label = role === "exporter" ? "My Policies" : "Active Coverage Backed by Vault";

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] transition-all duration-300"
      style={{ maxHeight: open ? "260px" : "32px" }}>
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between border-t border-panel-border px-4 py-1.5"
        style={{ background: "rgba(13,21,38,0.95)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(200,214,229,0.4)" }}>
            {label}
          </span>
          {count > 0 && (
            <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
              style={{ background: "rgba(0,212,255,0.12)", color: "var(--accent-cyan)" }}>
              {count}
            </span>
          )}
        </div>
        <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.3)" }}>
          {open ? "▼" : "▲"}
        </span>
      </button>

      {/* Table */}
      {open && (
        <div className="overflow-y-auto border-t border-panel-border"
          style={{ background: "rgba(13,21,38,0.95)", maxHeight: "228px" }}>
          {role === "exporter" ? (
            policies.length === 0 ? (
              <div className="p-4 text-center text-[11px]" style={{ color: "rgba(200,214,229,0.25)" }}>
                No policies yet. Click a vessel on the map to purchase coverage.
              </div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ color: "rgba(200,214,229,0.3)" }}>
                    <th className="px-4 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider">Voyage</th>
                    <th className="px-4 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider">Premium</th>
                    <th className="px-4 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider">Status</th>
                    <th className="px-4 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider">NFT ID</th>
                    <th className="px-4 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel-border">
                  {policies.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-1.5 font-mono" style={{ color: "var(--accent-cyan)" }}>{p.voyage_id}</td>
                      <td className="px-4 py-1.5 font-mono">{p.premium_amount} <span className="text-[9px] opacity-50">RLUSD</span></td>
                      <td className="px-4 py-1.5">
                        <span className={`badge ${p.status === "active" ? "badge-active" : p.status === "claim_paid" ? "badge-incident" : "badge-expired"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-1.5">
                        {p.nft_id ? (
                          <a href={`https://testnet.xrpl.org/nft/${p.nft_id}`} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-[10px] hover:underline" style={{ color: "rgba(0,212,255,0.6)" }}>
                            {p.nft_id.slice(0, 12)}...
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-1.5 text-[10px]" style={{ color: "rgba(200,214,229,0.3)" }}>
                        {p.created_at?.slice(0, 16)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            voyages.length === 0 ? (
              <div className="p-4 text-center text-[11px]" style={{ color: "rgba(200,214,229,0.25)" }}>
                No active voyages. Coverage policies sold from the vault will appear here.
              </div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr style={{ color: "rgba(200,214,229,0.3)" }}>
                    <th className="px-4 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider">Voyage</th>
                    <th className="px-4 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider">Route</th>
                    <th className="px-4 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider">Insured</th>
                    <th className="px-4 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider">Period</th>
                    <th className="px-4 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel-border">
                  {voyages.map((v) => (
                    <tr key={v.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-1.5 font-mono" style={{ color: "var(--accent-cyan)" }}>{v.id}</td>
                      <td className="px-4 py-1.5">{v.route_name}</td>
                      <td className="px-4 py-1.5 font-mono">{Number(v.insured_amount).toLocaleString()} <span className="text-[9px] opacity-50">RLUSD</span></td>
                      <td className="px-4 py-1.5 text-[10px]" style={{ color: "rgba(200,214,229,0.3)" }}>
                        {v.start_date.slice(0, 10)} — {v.end_date.slice(0, 10)}
                      </td>
                      <td className="px-4 py-1.5">
                        <span className={`badge ${v.status === "active" ? "badge-active" : v.status.includes("incident") ? "badge-incident" : "badge-expired"}`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}
    </div>
  );
}
