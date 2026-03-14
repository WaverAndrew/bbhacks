const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchApi(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data;
}

export const api = {
  health: () => fetchApi("/health"),
  lp: {
    vault: (wallet?: string) => fetchApi(`/lp/vault${wallet ? `?wallet=${encodeURIComponent(wallet)}` : ""}`),
    deposit: (body: { lpAddress: string; amount: string }) =>
      fetchApi("/lp/deposit", { method: "POST", body: JSON.stringify(body) }),
    withdraw: (body: { lpAddress: string; amount: string }) =>
      fetchApi("/lp/withdraw", { method: "POST", body: JSON.stringify(body) }),
  },
  coverage: {
    quote: (body: {
      insuredAmount: string;
      startDate: string;
      endDate: string;
      marketId?: string;
    }) =>
      fetchApi("/coverage/quote", { method: "POST", body: JSON.stringify(body) }),
    premium: (params: { marketId?: string; insuredAmount: string }) => {
      const q = new URLSearchParams();
      if (params.marketId) q.set("marketId", params.marketId);
      q.set("insuredAmount", params.insuredAmount);
      return fetchApi(`/coverage/premium?${q.toString()}`);
    },
    marketPrice: (marketId: string) =>
      fetchApi(`/coverage/market-price?marketId=${encodeURIComponent(marketId)}`),
    bind: (body: {
      voyageId: string;
      routeName: string;
      insuredAmount: string;
      startDate: string;
      endDate: string;
      premiumAmount: string;
      ownerAddress: string;
    }) => fetchApi("/coverage/bind", { method: "POST", body: JSON.stringify(body) }),
    policies: (owner?: string, voyageId?: string) => {
      const q = new URLSearchParams();
      if (owner) q.set("owner", owner);
      if (voyageId) q.set("voyageId", voyageId);
      return fetchApi(`/coverage/policies?${q.toString()}`);
    },
  },
  oracle: {
    voyages: () => fetchApi("/oracle/voyages"),
    incident: (voyageId: string) =>
      fetchApi(`/oracle/voyages/${encodeURIComponent(voyageId)}/incident`, { method: "POST" }),
    noIncident: (voyageId: string) =>
      fetchApi(`/oracle/voyages/${encodeURIComponent(voyageId)}/no-incident`, { method: "POST" }),
  },
  loan: {
    list: (borrower?: string) => fetchApi(`/loan/list${borrower ? `?borrower=${encodeURIComponent(borrower)}` : ""}`),
    apply: (body: { borrowerAddress: string; principal: string; tenorDays?: number }) =>
      fetchApi("/loan/apply", { method: "POST", body: JSON.stringify(body) }),
    draw: (body: { loanId: number }) => fetchApi("/loan/draw", { method: "POST", body: JSON.stringify(body) }),
    repay: (body: { loanId: number }) => fetchApi("/loan/repay", { method: "POST", body: JSON.stringify(body) }),
  },
};
