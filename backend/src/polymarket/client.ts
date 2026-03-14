/**
 * Polymarket API client: Gamma (events/markets) + CLOB (prices).
 * Used to derive insurance premium from prediction market probability.
 */

const GAMMA_BASE = process.env.POLYMARKET_GAMMA_URL ?? "https://gamma-api.polymarket.com";
const CLOB_BASE = process.env.POLYMARKET_CLOB_URL ?? "https://clob.polymarket.com";

export type PolymarketEvent = {
  id?: string;
  markets?: PolymarketMarket[];
  [k: string]: unknown;
};

export type PolymarketMarket = {
  id?: string;
  clobTokenIds?: string | string[];
  [k: string]: unknown;
};

/**
 * GET /events/{id} — returns event with markets and clobTokenIds.
 */
export async function getEvent(eventId: string | number): Promise<PolymarketEvent | null> {
  const id = typeof eventId === "number" ? String(eventId) : eventId.trim();
  if (!id) return null;
  const url = `${GAMMA_BASE}/events/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Polymarket Gamma error: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as PolymarketEvent;
  return data;
}

/**
 * Parse clobTokenIds from a market.
 * Gamma often returns it as a JSON string e.g. "[\"id1\", \"id2\"]", or as an array.
 * Returns [yesTokenId, noTokenId] per Polymarket convention (index 0 = Yes).
 */
function parseClobTokenIds(market: PolymarketMarket): [string, string] | null {
  const raw = market.clobTokenIds;
  if (raw == null) return null;
  let ids: string[];
  if (Array.isArray(raw)) {
    ids = raw.filter((x): x is string => typeof x === "string");
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        ids = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
      } catch {
        ids = trimmed.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim().replace(/^"|"$/g, "")).filter(Boolean);
      }
    } else {
      ids = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    }
  } else {
    return null;
  }
  const a = ids[0];
  const b = ids[1];
  if (ids.length < 2 || a === undefined || b === undefined) return null;
  return [a, b];
}

/**
 * Get Yes/No token IDs from the first market of an event.
 */
export function getEventTokenIds(event: PolymarketEvent): { yesTokenId: string; noTokenId: string } | null {
  const markets = event.markets;
  if (!Array.isArray(markets) || markets.length === 0) return null;
  const pair = parseClobTokenIds(markets[0] as PolymarketMarket);
  if (!pair) return null;
  return { yesTokenId: pair[0], noTokenId: pair[1] };
}

/**
 * GET /price?token_id=...&side=BUY|SELL — returns best price (0–1).
 */
export async function getPrice(tokenId: string, side: "BUY" | "SELL"): Promise<number> {
  const url = `${CLOB_BASE}/price?token_id=${encodeURIComponent(tokenId)}&side=${side}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error("No orderbook exists for this token");
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `CLOB error: ${res.status}`);
  }
  const data = (await res.json()) as { price?: number | string };
  const p = data.price;
  if (p === undefined || p === null) throw new Error("Invalid price response");
  const num = typeof p === "number" ? p : Number(p);
  if (Number.isNaN(num)) throw new Error("Invalid price response");
  return num;
}

const FALLBACK_RATE = 0.02;

/** True if id looks like a CLOB token ID (long numeric string) rather than a Gamma event ID. */
export function isTokenId(id: string): boolean {
  const s = String(id).trim();
  return /^\d+$/.test(s) && s.length > 30;
}

/**
 * Get raw market price (0–1) for the configured market. Used for display (not premium calculation).
 */
export async function getMarketPrice(marketId: string): Promise<number | null> {
  const id = marketId.trim();
  if (!id) return null;
  try {
    if (isTokenId(id)) {
      return await getPrice(id, "BUY");
    }
    const event = await getEvent(id);
    if (!event) return null;
    const tokenIds = getEventTokenIds(event);
    if (!tokenIds) return null;
    return await getPrice(tokenIds.yesTokenId, "BUY");
  } catch {
    return null;
  }
}

/**
 * Compute premium from a CLOB token ID directly (Yes outcome BUY price × amount).
 * Use when you have the token_id instead of an event_id.
 */
export async function getPremiumFromTokenId(
  tokenId: string,
  insuredAmount: number
): Promise<{ premium: string; source: "polymarket" | "fallback"; errorDetail?: string }> {
  const amount = Number(insuredAmount) || 0;
  const fallbackPremium = (amount * FALLBACK_RATE).toFixed(2);
  try {
    const price = await getPrice(tokenId.trim(), "BUY");
    const premium = (price * amount).toFixed(2);
    return { premium, source: "polymarket" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { premium: fallbackPremium, source: "fallback", errorDetail: msg };
  }
}

/**
 * Compute premium from Polymarket: event → first market → Yes token BUY price × insuredAmount.
 * On any failure, returns fallback premium (2% of insured amount) and source 'fallback'.
 */
export async function getPremiumFromEvent(
  eventId: string | number,
  insuredAmount: number
): Promise<{ premium: string; source: "polymarket" | "fallback"; errorDetail?: string }> {
  const amount = Number(insuredAmount) || 0;
  const fallbackPremium = (amount * FALLBACK_RATE).toFixed(2);

  try {
    const event = await getEvent(eventId);
    if (!event) return { premium: fallbackPremium, source: "fallback", errorDetail: "Event not found" };
    const tokenIds = getEventTokenIds(event);
    if (!tokenIds) return { premium: fallbackPremium, source: "fallback", errorDetail: "No token IDs in event" };
    const price = await getPrice(tokenIds.yesTokenId, "BUY");
    const premium = (price * amount).toFixed(2);
    return { premium, source: "polymarket" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { premium: fallbackPremium, source: "fallback", errorDetail: msg };
  }
}
