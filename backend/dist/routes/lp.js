"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lpRouter = void 0;
const express_1 = require("express");
const config_1 = require("../config");
const vault_1 = require("../xrpl/vault");
const accounts_1 = require("../xrpl/accounts");
const config_2 = require("../config");
exports.lpRouter = (0, express_1.Router)();
exports.lpRouter.post("/deposit", async (req, res) => {
    try {
        const { lpAddress, amount } = req.body;
        if (!lpAddress || !amount) {
            return res.status(400).json({ error: "lpAddress and amount required" });
        }
        if (!config_1.VAULT_ACCOUNT_SEED || !config_1.VAULT_ACCOUNT_ADDRESS || !config_2.RLUSD_ISSUER_ADDRESS) {
            return res.status(500).json({ error: "Vault not configured" });
        }
        const amountNum = Number(amount);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            return res.status(400).json({ error: "amount must be a positive number" });
        }
        // Require LP to have at least `amount` RLUSD (they must send RLUSD to Vault first; we don't have their key).
        const lpRlusdBalance = await (0, accounts_1.getTrustLineBalance)(lpAddress, config_2.RLUSD_CURRENCY, config_2.RLUSD_ISSUER_ADDRESS);
        if (Number(lpRlusdBalance) < amountNum) {
            return res.status(400).json({
                error: `Insufficient RLUSD balance. Your balance: ${lpRlusdBalance}. Send at least ${amount} RLUSD to the Vault address (${config_1.VAULT_ACCOUNT_ADDRESS}) first, then retry.`,
            });
        }
        // LP must have a vRLUSD trust line to the Vault or the mint tx will fail (tecNO_LINE).
        const hasVrlLine = await (0, accounts_1.hasTrustLine)(lpAddress, config_2.VRLUSD_CURRENCY, config_1.VAULT_ACCOUNT_ADDRESS);
        if (!hasVrlLine) {
            return res.status(400).json({
                error: "Set up a vRLUSD trust line to the Vault first (run scripts/setup-vault-trust.ts with RECIPIENT_SEED, or use your wallet to add a trust line to the Vault for currency VRL).",
            });
        }
        const { txHash } = await (0, vault_1.vaultDeposit)(lpAddress, amount);
        return res.json({ txHash, message: "Deposited RLUSD; vRLUSD minted to your wallet." });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
exports.lpRouter.post("/withdraw", async (req, res) => {
    try {
        const { lpAddress, amount } = req.body;
        if (!lpAddress || !amount) {
            return res.status(400).json({ error: "lpAddress and amount required" });
        }
        const { txHash } = await (0, vault_1.vaultWithdraw)(lpAddress, amount);
        return res.json({ txHash, message: "Withdrawn RLUSD from Vault." });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
exports.lpRouter.get("/vault", async (req, res) => {
    try {
        const { totalRlusd, totalVrlusd } = await (0, vault_1.getVaultTVL)();
        const owner = req.query.wallet;
        let userRlusd = "0";
        let userVrlusd = "0";
        if (owner && config_2.RLUSD_ISSUER_ADDRESS) {
            userRlusd = await (0, accounts_1.getTrustLineBalance)(owner, config_2.RLUSD_CURRENCY, config_2.RLUSD_ISSUER_ADDRESS);
            userVrlusd = config_1.VAULT_ACCOUNT_ADDRESS
                ? await (0, accounts_1.getTrustLineBalance)(owner, config_2.VRLUSD_CURRENCY, config_1.VAULT_ACCOUNT_ADDRESS)
                : "0";
        }
        res.json({
            totalRlusd,
            totalVrlusd,
            tvl: totalRlusd,
            userRlusd,
            userVrlusd,
            estimatedApr: "0", // placeholder
            vaultAddress: config_1.VAULT_ACCOUNT_ADDRESS || undefined,
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
//# sourceMappingURL=lp.js.map