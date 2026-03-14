import { Router } from "express";
import * as db from "../db/queries";
import { getMarketPrice, getPremiumFromEvent, getPremiumFromTokenId, isTokenId } from "../polymarket/client";
import { mintCoverageNFT } from "../xrpl/tokens";

export const coverageRouter = Router();

const PREMIUM_RATE = 0.02; // 2% of insured amount when no marketId

/**
 * POST /coverage/quote
 * Body: { insuredAmount, startDate, endDate, marketId? }
 * If marketId (Polymarket event ID) is provided, premium is derived from Polymarket; else 2% default.
 */
coverageRouter.post("/quote", async (req, res) => {
  try {
    const { insuredAmount, startDate, endDate, marketId } = req.body as {
      insuredAmount: string;
      startDate: string;
      endDate: string;
      marketId?: string;
    };
    const amount = Number(insuredAmount) || 0;
    if (marketId && String(marketId).trim()) {
      const id = marketId.trim();
      const { premium, source, errorDetail } = isTokenId(id)
        ? await getPremiumFromTokenId(id, amount)
        : await getPremiumFromEvent(id, amount);
      return res.json({
        premium,
        insuredAmount: String(amount),
        startDate,
        endDate,
        source,
        ...(errorDetail && { errorDetail }),
      });
    }
    const premium = (amount * PREMIUM_RATE).toFixed(2);
    res.json({
      premium,
      insuredAmount: String(amount),
      startDate,
      endDate,
      source: "default",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Quote failed";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /coverage/market-price?marketId=
 * Returns raw Polymarket price (0–1) for the market, for display (not premium).
 */
coverageRouter.get("/market-price", async (req, res) => {
  const marketId = (req.query.marketId as string)?.trim();
  const marketIdShort = marketId ? marketId.slice(0, 8) + "..." : undefined;
  console.log("[coverage] GET /market-price", { marketId: marketIdShort });
  try {
    if (!marketId) return res.status(400).json({ error: "marketId required" });
    const price = await getMarketPrice(marketId);
    if (price === null) {
      console.log("[coverage] GET /market-price -> 404 (price not available)");
      return res.status(404).json({ error: "Price not available" });
    }
    console.log("[coverage] GET /market-price -> 200", { price });
    res.json({ price, source: "polymarket" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Market price failed";
    console.log("[coverage] GET /market-price -> 500", { error: message });
    res.status(500).json({ error: message });
  }
});

/**
 * GET /coverage/premium?marketId=&insuredAmount=
 * Returns only { premium, source } for live estimate in CONFIGURE step.
 */
coverageRouter.get("/premium", async (req, res) => {
  const marketId = (req.query.marketId as string)?.trim();
  const insuredAmount = req.query.insuredAmount as string;
  const marketIdShort = marketId ? marketId.slice(0, 8) + "..." : undefined;
  console.log("[coverage] GET /premium", { marketId: marketIdShort, insuredAmount });
  try {
    const amount = Number(insuredAmount) || 0;
    if (marketId && amount > 0) {
      const { premium, source, errorDetail } = isTokenId(marketId)
        ? await getPremiumFromTokenId(marketId, amount)
        : await getPremiumFromEvent(marketId, amount);
      console.log("[coverage] GET /premium -> 200", { premium, source, errorDetail: errorDetail || undefined });
      return res.json({ premium, source, ...(errorDetail && { errorDetail }) });
    }
    const premium = (amount * PREMIUM_RATE).toFixed(2);
    console.log("[coverage] GET /premium -> 200 (default)", { premium });
    res.json({ premium, source: "default" });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Premium failed";
    console.log("[coverage] GET /premium -> 500", { error: message });
    res.status(500).json({ error: message });
  }
});

/**
 * POST /coverage/bind
 * Exporter has already sent premium RLUSD to Vault (frontend). We create voyage, mint coverage NFT, record policy.
 * Body: { voyageId, routeName, insuredAmount, startDate, endDate, premiumAmount, ownerAddress }
 */
coverageRouter.post("/bind", async (req, res) => {
  try {
    const {
      voyageId,
      routeName,
      insuredAmount,
      startDate,
      endDate,
      premiumAmount,
      ownerAddress,
    } = req.body as {
      voyageId: string;
      routeName: string;
      insuredAmount: string;
      startDate: string;
      endDate: string;
      premiumAmount: string;
      ownerAddress: string;
    };
    if (!voyageId || !ownerAddress || !premiumAmount) {
      return res.status(400).json({ error: "voyageId, ownerAddress, premiumAmount required" });
    }
    const existing = await db.getVoyage(voyageId);
    if (existing) {
      return res.status(400).json({ error: "Voyage already exists" });
    }
    await db.insertVoyage({
      id: voyageId,
      route_name: routeName || voyageId,
      insured_amount: insuredAmount || "0",
      start_date: startDate || new Date().toISOString(),
      end_date: endDate || new Date().toISOString(),
      status: "active",
    });
    const metadataUri = `https://vault.example/policy/${voyageId}`;
    const { nftId, txHash } = await mintCoverageNFT(voyageId, metadataUri);
    const policyId = await db.insertPolicy({
      voyage_id: voyageId,
      owner_address: ownerAddress,
      premium_amount: premiumAmount,
      nft_id: nftId,
      status: "active",
    });
    res.json({
      policyId,
      voyageId,
      nftId,
      txHash,
      message: "Your RLUSD premium is now locked; coverage NFT minted on XRPL.",
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

/**
 * GET /coverage/policies?owner=...&voyageId=...
 */
coverageRouter.get("/policies", async (req, res) => {
  try {
    const owner = req.query.owner as string | undefined;
    const voyageId = req.query.voyageId as string | undefined;
    const list = await db.listPolicies(owner, voyageId);
    res.json({ policies: list });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});
