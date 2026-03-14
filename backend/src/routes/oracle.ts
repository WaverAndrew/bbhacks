import { Router } from "express";
import { VAULT_ACCOUNT_SEED, RLUSD_ISSUER_ADDRESS, RLUSD_CURRENCY } from "../config";
import * as db from "../db/queries";
import { cancelEscrow, finishEscrow } from "../xrpl/escrows";
import { burnCoverageNFTByIssuer } from "../xrpl/tokens";
import { sendRLUSD } from "../xrpl/payments";

export const oracleRouter = Router();

/**
 * POST /oracle/voyages/:id/incident
 * Pay out insured amount from Vault to policy owner, burn coverage NFT, mark resolved.
 */
oracleRouter.post("/voyages/:id/incident", async (req, res) => {
  try {
    const voyageId = req.params.id;
    const voyage = await db.getVoyage(voyageId);
    if (!voyage) {
      return res.status(404).json({ error: "Voyage not found" });
    }
    const policies = await db.listPolicies(undefined, voyageId);
    const activePolicy = policies.find((p) => p.status === "active");
    if (!activePolicy) {
      return res.status(400).json({ error: "No active policy for this voyage" });
    }
    if (!VAULT_ACCOUNT_SEED || !RLUSD_ISSUER_ADDRESS) {
      return res.status(500).json({ error: "Vault/issuer not configured" });
    }
    const insuredAmount = voyage.insured_amount;
    let payoutTxHash = "";
    let escrowFinishTxHash = "";

    if (activePolicy.escrow_owner && activePolicy.escrow_sequence != null && VAULT_ACCOUNT_SEED) {
      const finishResult = await finishEscrow({
        fromSeed: VAULT_ACCOUNT_SEED,
        owner: activePolicy.escrow_owner,
        offerSequence: activePolicy.escrow_sequence,
      });
      escrowFinishTxHash = (finishResult.result as { hash?: string })?.hash ?? "";
    }

    const result = await sendRLUSD({
      fromSeed: VAULT_ACCOUNT_SEED,
      toAddress: activePolicy.owner_address,
      amount: insuredAmount,
      currency: RLUSD_CURRENCY,
      issuer: RLUSD_ISSUER_ADDRESS,
    });
    payoutTxHash = (result.result as any).hash ?? "";
    if (activePolicy.nft_id) {
      await burnCoverageNFTByIssuer(activePolicy.nft_id);
    }
    await db.updatePolicyStatus(activePolicy.id, "claim_paid");
    await db.updateVoyageStatus(voyageId, "incident_paid");
    res.json({
      success: true,
      payoutTxHash,
      ...(escrowFinishTxHash && { escrowFinishTxHash }),
      paidTo: activePolicy.owner_address,
      amount: insuredAmount,
      message: "Claim paid in RLUSD from Vault; coverage NFT burned."
        + (escrowFinishTxHash ? " Escrowed XRP released to policy owner." : ""),
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

/**
 * POST /oracle/voyages/:id/no-incident
 * No payout; burn coverage NFT, mark voyage as expired (premium stays in Vault).
 */
oracleRouter.post("/voyages/:id/no-incident", async (req, res) => {
  try {
    const voyageId = req.params.id;
    const voyage = await db.getVoyage(voyageId);
    if (!voyage) {
      return res.status(404).json({ error: "Voyage not found" });
    }
    const policies = await db.listPolicies(undefined, voyageId);
    const activePolicy = policies.find((p) => p.status === "active");
    if (!activePolicy) {
      return res.status(400).json({ error: "No active policy for this voyage" });
    }
    let burnTxHash = "";
    let escrowCancelTxHash = "";

    if (activePolicy.escrow_owner && activePolicy.escrow_sequence != null && VAULT_ACCOUNT_SEED) {
      const cancelResult = await cancelEscrow({
        fromSeed: VAULT_ACCOUNT_SEED,
        owner: activePolicy.escrow_owner,
        offerSequence: activePolicy.escrow_sequence,
      });
      escrowCancelTxHash = (cancelResult.result as { hash?: string })?.hash ?? "";
    }

    if (activePolicy.nft_id) {
      const burnResult = await burnCoverageNFTByIssuer(activePolicy.nft_id);
      burnTxHash = burnResult.txHash;
    }
    await db.updatePolicyStatus(activePolicy.id, "expired");
    await db.updateVoyageStatus(voyageId, "no_incident");
    res.json({
      success: true,
      burnTxHash,
      ...(escrowCancelTxHash && { escrowCancelTxHash }),
      message: "No incident; coverage NFT burned. Premium remains in Vault."
        + (escrowCancelTxHash ? " Escrowed XRP returned to Vault." : ""),
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

/**
 * GET /oracle/voyages - list voyages for admin dropdown
 */
oracleRouter.get("/voyages", async (_req, res) => {
  try {
    const voyages = await db.listVoyages();
    res.json({ voyages });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});
