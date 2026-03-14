"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { VaultData } from "@/lib/types";

type Props = {
  wallet: string;
};

export default function WalletBar({ wallet }: Props) {
  const [vault, setVault] = useState<VaultData | null>(null);

  useEffect(() => {
    if (!wallet) return;
    api.lp.vault(wallet).then((d: any) => setVault(d)).catch(() => {});
    const t = setInterval(() => {
      api.lp.vault(wallet).then((d: any) => setVault(d)).catch(() => {});
    }, 15000);
    return () => clearInterval(t);
  }, [wallet]);

  if (!wallet) return null;

  return (
    <div className="flex items-center gap-3">
      {/* RLUSD Balance */}
      <div className="flex items-center gap-1.5 rounded border px-2.5 py-1"
        style={{ borderColor: "rgba(0,212,255,0.2)", background: "rgba(0,212,255,0.04)" }}>
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="var(--accent-cyan)">
          <circle cx="8" cy="8" r="7" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.2" />
          <text x="8" y="11" textAnchor="middle" fontSize="8" fill="var(--accent-cyan)" fontWeight="bold">$</text>
        </svg>
        <span className="font-mono text-[11px] font-bold" style={{ color: "var(--accent-cyan)" }}>
          {vault ? Number(vault.userRlusd).toLocaleString() : "—"}
        </span>
        <span className="text-[9px] font-semibold uppercase" style={{ color: "rgba(200,214,229,0.35)" }}>RLUSD</span>
      </div>

      {/* vRLUSD Balance */}
      <div className="flex items-center gap-1.5 rounded border px-2.5 py-1"
        style={{ borderColor: "rgba(0,255,136,0.2)", background: "rgba(0,255,136,0.04)" }}>
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="var(--accent-green)">
          <rect x="2" y="4" width="12" height="8" rx="2" fill="none" stroke="var(--accent-green)" strokeWidth="1.2" />
          <path d="M6 7v2M10 7v2M8 6v4" stroke="var(--accent-green)" strokeWidth="1" />
        </svg>
        <span className="font-mono text-[11px] font-bold" style={{ color: "var(--accent-green)" }}>
          {vault ? Number(vault.userVrlusd).toLocaleString() : "—"}
        </span>
        <span className="text-[9px] font-semibold uppercase" style={{ color: "rgba(200,214,229,0.35)" }}>vRLUSD</span>
      </div>
    </div>
  );
}
