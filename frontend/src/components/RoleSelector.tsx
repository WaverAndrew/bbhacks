"use client";

import { useState } from "react";
import type { Role } from "@/lib/types";

type Props = {
  onSelect: (role: Role, wallet: string) => void;
};

export default function RoleSelector({ onSelect }: Props) {
  const [wallet, setWallet] = useState("");
  const [hoveredRole, setHoveredRole] = useState<Role | null>(null);

  return (
    <div className="absolute inset-0 z-[2000] flex items-center justify-center"
      style={{ background: "rgba(10,15,26,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-3xl space-y-8 px-6">
        {/* Logo */}
        <div className="text-center">
          <div className="mb-2 flex items-center justify-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded"
              style={{ background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)" }}>
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="var(--accent-cyan)">
                <path d="M10 2L3 7v6l7 5 7-5V7l-7-5zm0 2.5L14.5 8 10 11.5 5.5 8 10 4.5z" />
              </svg>
            </div>
            <h1 className="font-mono text-2xl font-bold tracking-wider" style={{ color: "var(--accent-cyan)" }}>
              AEGIS
            </h1>
          </div>
          <p className="text-sm" style={{ color: "rgba(200,214,229,0.5)" }}>
            Parametric Insurance Vault on XRPL
          </p>
        </div>

        {/* Wallet Input */}
        <div className="mx-auto max-w-md">
          <label className="mb-1.5 block text-center text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "rgba(200,214,229,0.4)" }}>
            Your XRPL Testnet Wallet Address
          </label>
          <input
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="rXXXX..."
            className="input-dark w-full text-center text-sm"
            style={{ padding: "10px 16px" }}
          />
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Provider */}
          <button
            onClick={() => wallet && onSelect("provider", wallet)}
            onMouseEnter={() => setHoveredRole("provider")}
            onMouseLeave={() => setHoveredRole(null)}
            disabled={!wallet}
            className={`group relative overflow-hidden rounded border p-6 text-left transition-all duration-300 ${
              !wallet ? "cursor-not-allowed opacity-40" : "cursor-pointer"
            }`}
            style={{
              background: hoveredRole === "provider"
                ? "rgba(0,212,255,0.06)"
                : "rgba(13,21,38,0.8)",
              borderColor: hoveredRole === "provider"
                ? "rgba(0,212,255,0.4)"
                : "var(--panel-border)",
              boxShadow: hoveredRole === "provider"
                ? "0 0 30px rgba(0,212,255,0.1)"
                : "none",
            }}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded"
              style={{ background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5">
                <rect x="3" y="10" width="18" height="11" rx="2" />
                <path d="M7 10V7a5 5 0 0110 0v3" />
                <circle cx="12" cy="16" r="1.5" />
              </svg>
            </div>
            <h2 className="mb-1 text-base font-bold" style={{ color: "var(--accent-cyan)" }}>
              Liquidity Provider
            </h2>
            <p className="mb-4 text-xs leading-relaxed" style={{ color: "rgba(200,214,229,0.5)" }}>
              Deposit RLUSD into the vault, receive vRLUSD share tokens, and earn yield from coverage premiums and loan interest.
            </p>
            <div className="space-y-1.5">
              <StepPreview n={1} text="Connect wallet & set trust lines" />
              <StepPreview n={2} text="Deposit RLUSD into the vault" />
              <StepPreview n={3} text="Receive vRLUSD share tokens on XRPL" />
              <StepPreview n={4} text="Earn premiums as policies are sold" />
            </div>
            <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--accent-cyan)" }}>
              Enter as Provider &rarr;
            </div>
          </button>

          {/* Exporter / Shipowner */}
          <button
            onClick={() => wallet && onSelect("exporter", wallet)}
            onMouseEnter={() => setHoveredRole("exporter")}
            onMouseLeave={() => setHoveredRole(null)}
            disabled={!wallet}
            className={`group relative overflow-hidden rounded border p-6 text-left transition-all duration-300 ${
              !wallet ? "cursor-not-allowed opacity-40" : "cursor-pointer"
            }`}
            style={{
              background: hoveredRole === "exporter"
                ? "rgba(0,255,136,0.04)"
                : "rgba(13,21,38,0.8)",
              borderColor: hoveredRole === "exporter"
                ? "rgba(0,255,136,0.4)"
                : "var(--panel-border)",
              boxShadow: hoveredRole === "exporter"
                ? "0 0 30px rgba(0,255,136,0.1)"
                : "none",
            }}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded"
              style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.2)" }}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="var(--accent-green)" strokeWidth="1.5">
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
            </div>
            <h2 className="mb-1 text-base font-bold" style={{ color: "var(--accent-green)" }}>
              Shipowner / Exporter
            </h2>
            <p className="mb-4 text-xs leading-relaxed" style={{ color: "rgba(200,214,229,0.5)" }}>
              Insure your cargo through high-risk corridors. Click on any vessel to purchase parametric coverage backed by RLUSD.
            </p>
            <div className="space-y-1.5">
              <StepPreview n={1} text="Select a vessel on the map" color="var(--accent-green)" />
              <StepPreview n={2} text="Get an instant quote (2% premium)" color="var(--accent-green)" />
              <StepPreview n={3} text="Pay premium in RLUSD on XRPL" color="var(--accent-green)" />
              <StepPreview n={4} text="Coverage NFT minted to your wallet" color="var(--accent-green)" />
            </div>
            <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--accent-green)" }}>
              Enter as Shipowner &rarr;
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="animate-pulse-glow inline-block h-2 w-2 rounded-full" style={{ background: "var(--accent-green)" }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(200,214,229,0.3)" }}>
              XRPL Testnet
            </span>
          </div>
          <span style={{ color: "rgba(200,214,229,0.15)" }}>|</span>
          <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.25)" }}>
            Issued Currencies &middot; Trust Lines &middot; XLS-20 NFTs &middot; Parametric Payouts
          </span>
        </div>
      </div>
    </div>
  );
}

function StepPreview({ n, text, color = "var(--accent-cyan)" }: { n: number; text: string; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}
      >
        {n}
      </div>
      <span className="text-[10px]" style={{ color: "rgba(200,214,229,0.45)" }}>{text}</span>
    </div>
  );
}
