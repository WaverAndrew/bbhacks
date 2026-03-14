import { Router } from "express";
import { VAULT_ACCOUNT_ADDRESS, VAULT_ACCOUNT_SEED } from "../config";
import { vaultDeposit, vaultWithdraw, getVaultTVL } from "../xrpl/vault";
import { getTrustLineBalance, hasTrustLine } from "../xrpl/accounts";
import { RLUSD_CURRENCY, RLUSD_ISSUER_ADDRESS, VRLUSD_CURRENCY } from "../config";

export const lpRouter = Router();

lpRouter.post("/deposit", async (req, res) => {
  try {
    const { lpAddress, amount } = req.body as { lpAddress: string; amount: string };
    if (!lpAddress || !amount) {
      return res.status(400).json({ error: "lpAddress and amount required" });
    }
    if (!VAULT_ACCOUNT_SEED || !VAULT_ACCOUNT_ADDRESS || !RLUSD_ISSUER_ADDRESS) {
      return res.status(500).json({ error: "Vault not configured" });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }

    // LP must have a vRLUSD trust line to the Vault or the mint tx will fail (tecNO_LINE).
    const hasVrlLine = await hasTrustLine(lpAddress, VRLUSD_CURRENCY, VAULT_ACCOUNT_ADDRESS);
    if (!hasVrlLine) {
      return res.status(400).json({
        error: "Set up a vRLUSD trust line to the Vault first (run scripts/setup-vault-trust.ts with RECIPIENT_SEED, or use your wallet to add a trust line to the Vault for currency VRL).",
      });
    }

    const { txHash } = await vaultDeposit(lpAddress, amount);
    return res.json({ txHash, message: "Deposited RLUSD; vRLUSD minted to your wallet." });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

lpRouter.post("/withdraw", async (req, res) => {
  try {
    const { lpAddress, amount } = req.body as { lpAddress: string; amount: string };
    if (!lpAddress || !amount) {
      return res.status(400).json({ error: "lpAddress and amount required" });
    }
    const { txHash } = await vaultWithdraw(lpAddress, amount);
    return res.json({ txHash, message: "Withdrawn RLUSD from Vault." });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

lpRouter.get("/vault", async (req, res) => {
  try {
    const { totalRlusd, totalVrlusd } = await getVaultTVL();
    const owner = req.query.wallet as string | undefined;
    let userRlusd = "0";
    let userVrlusd = "0";
    if (owner && RLUSD_ISSUER_ADDRESS) {
      userRlusd = await getTrustLineBalance(owner, RLUSD_CURRENCY, RLUSD_ISSUER_ADDRESS);
      userVrlusd = VAULT_ACCOUNT_ADDRESS
        ? await getTrustLineBalance(owner, VRLUSD_CURRENCY, VAULT_ACCOUNT_ADDRESS)
        : "0";
    }
    res.json({
      totalRlusd,
      totalVrlusd,
      tvl: totalRlusd,
      userRlusd,
      userVrlusd,
      estimatedApr: "0", // placeholder
      vaultAddress: VAULT_ACCOUNT_ADDRESS || undefined,
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

