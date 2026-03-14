"use client";

import type { XrplStep } from "@/lib/types";

type Props = {
  steps: XrplStep[];
  title?: string;
};

export default function XrplTimeline({ steps, title }: Props) {
  return (
    <div className="panel p-3">
      {title && (
        <div className="panel-header -mx-3 -mt-3 mb-3 flex items-center gap-2 px-3 py-2">
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="var(--accent-cyan)">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM7.25 4v4.5l3.5 2.1.75-1.23-2.75-1.64V4h-1.5z" />
          </svg>
          <span>{title}</span>
        </div>
      )}
      <div className="relative space-y-0">
        {steps.map((step, i) => (
          <div key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className="absolute left-[9px] top-[20px] w-[2px]"
                style={{
                  height: "calc(100% - 12px)",
                  background:
                    step.status === "complete"
                      ? "var(--accent-green)"
                      : "var(--panel-border)",
                  opacity: step.status === "complete" ? 0.4 : 0.6,
                }}
              />
            )}

            {/* Status dot */}
            <div className="relative z-10 mt-[2px] flex-shrink-0">
              {step.status === "pending" && (
                <div
                  className="h-5 w-5 rounded-full border-2"
                  style={{
                    borderColor: "var(--panel-border)",
                    background: "var(--background)",
                  }}
                />
              )}
              {step.status === "active" && (
                <div
                  className="h-5 w-5 rounded-full border-2"
                  style={{
                    borderColor: "var(--accent-cyan)",
                    background: "rgba(0,212,255,0.15)",
                    animation: "pulse-glow 1.5s ease-in-out infinite",
                  }}
                >
                  <div
                    className="mt-[3px] ml-[3px] h-2 w-2 rounded-full"
                    style={{ background: "var(--accent-cyan)" }}
                  />
                </div>
              )}
              {step.status === "complete" && (
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: "rgba(0,255,136,0.2)", border: "2px solid var(--accent-green)" }}
                >
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="var(--accent-green)">
                    <path d="M10.28 2.28L4.5 8.06 1.72 5.28l-.94.94L4.5 9.94l6.72-6.72-.94-.94z" />
                  </svg>
                </div>
              )}
              {step.status === "error" && (
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: "rgba(255,51,102,0.2)", border: "2px solid var(--accent-red)" }}
                >
                  <span className="text-[10px] font-bold" style={{ color: "var(--accent-red)" }}>!</span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-[11px] font-semibold"
                  style={{
                    color:
                      step.status === "complete"
                        ? "var(--accent-green)"
                        : step.status === "active"
                        ? "var(--accent-cyan)"
                        : step.status === "error"
                        ? "var(--accent-red)"
                        : "rgba(200,214,229,0.5)",
                  }}
                >
                  {step.label}
                </span>
                {step.status === "active" && (
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--accent-cyan)" }}>
                    Processing...
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: "rgba(200,214,229,0.4)" }}>
                {step.description}
              </div>
              {step.txHash && (
                <a
                  href={`https://testnet.xrpl.org/transactions/${step.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] hover:underline"
                  style={{ color: "var(--accent-cyan)" }}
                >
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor">
                    <path d="M3.5 1v1.5h4.79L1 9.79 2.21 11 9.5 3.71V8.5H11V1H3.5z" />
                  </svg>
                  {step.txHash.slice(0, 8)}...{step.txHash.slice(-6)}
                </a>
              )}
              {step.detail && (
                <div className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--accent-amber)" }}>
                  {step.detail}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
