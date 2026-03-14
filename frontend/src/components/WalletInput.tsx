"use client";

import { useState } from "react";

type Props = {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  label?: string;
};

export function WalletInput({ value, onChange, placeholder = "rXXXX...", label = "Wallet address" }: Props) {
  const [addr, setAddr] = useState(value);
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <input
        type="text"
        value={addr}
        onChange={(e) => {
          setAddr(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
      />
    </div>
  );
}
