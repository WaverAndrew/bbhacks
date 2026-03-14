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
        if (!config_1.VAULT_ACCOUNT_SEED) {
            return res.status(500).json({ error: "Vault not configured" });
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
        });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: e?.message ?? "unknown error" });
    }
});
//# sourceMappingURL=lp.js.map