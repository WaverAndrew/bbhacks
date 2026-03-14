import { Router } from "express";
import { VAULT_ACCOUNT_ADDRESS, VAULT_ACCOUNT_SEED } from "../config";
import { vaultDeposit, vaultWithdraw, getVaultTVL } from "../xrpl/vault";
import { getTrustLineBalance } from "../xrpl/accounts";
import { RLUSD_CURRENCY, RLUSD_ISSUER_ADDRESS, VRLUSD_CURRENCY } from "../config";

export const lpRouter = Router();

lpRouter.post("/deposit", async (req, res) => {
  try {
    const { lpAddress, amount } = req.body as { lpAddress: string; amount: string };
    if (!lpAddress || !amount) {
      return res.status(400).json({ error: "lpAddress and amount required" });
    }
    if (!VAULT_ACCOUNT_SEED) {
      return res.status(500).json({ error: "Vault not configured" });
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
    });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

