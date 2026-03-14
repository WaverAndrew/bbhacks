import { Router } from "express";
import * as db from "../db/queries";
import { mintCoverageNFT } from "../xrpl/tokens";

export const coverageRouter = Router();

const PREMIUM_RATE = 0.02; // 2% of insured amount for MVP

/**
 * POST /coverage/quote
 * Body: { insuredAmount, startDate, endDate }
 */
coverageRouter.post("/quote", (req, res) => {
  const { insuredAmount, startDate, endDate } = req.body as {
    insuredAmount: string;
    startDate: string;
    endDate: string;
  };
  const amount = Number(insuredAmount) || 0;
  const premium = (amount * PREMIUM_RATE).toFixed(2);
  res.json({ premium, insuredAmount: String(amount), startDate, endDate });
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
