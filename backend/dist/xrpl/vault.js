"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vaultDeposit = vaultDeposit;
exports.vaultWithdraw = vaultWithdraw;
exports.getVaultTVL = getVaultTVL;
const config_1 = require("../config");
const client_1 = require("./client");
const payments_1 = require("./payments");
const queries_1 = require("../db/queries");
/**
 * LP has already sent RLUSD to Vault (user signs in frontend).
 * Backend mints vRLUSD to LP proportionally (1:1 for MVP).
 */
async function vaultDeposit(lpAddress, rlusdAmount) {
    if (!config_1.VAULT_ACCOUNT_SEED || !config_1.VAULT_ACCOUNT_ADDRESS) {
        throw new Error("Vault not configured");
    }
    const result = await (0, payments_1.sendRLUSD)({
        fromSeed: config_1.VAULT_ACCOUNT_SEED,
        toAddress: lpAddress,
        amount: rlusdAmount,
        currency: config_1.VRLUSD_CURRENCY,
        issuer: config_1.VAULT_ACCOUNT_ADDRESS,
    });
    const state = await (0, queries_1.getVaultState)();
    const newRlusd = String(Number(state.total_rlusd) + Number(rlusdAmount));
    const newVrlusd = String(Number(state.total_vrlusd) + Number(rlusdAmount));
    await (0, queries_1.updateVaultState)(newRlusd, newVrlusd);
    return { txHash: result.result.hash ?? "" };
}
/**
 * LP sends vRLUSD back to Vault; backend sends RLUSD from Vault to LP.
 */
async function vaultWithdraw(lpAddress, vRlusdAmount) {
    if (!config_1.VAULT_ACCOUNT_SEED || !config_1.VAULT_ACCOUNT_ADDRESS || !config_1.RLUSD_ISSUER_ADDRESS) {
        throw new Error("Vault/issuer not configured");
    }
    const result = await (0, payments_1.sendRLUSD)({
        fromSeed: config_1.VAULT_ACCOUNT_SEED,
        toAddress: lpAddress,
        amount: vRlusdAmount,
        currency: config_1.RLUSD_CURRENCY,
        issuer: config_1.RLUSD_ISSUER_ADDRESS,
    });
    const state = await (0, queries_1.getVaultState)();
    const newRlusd = String(Math.max(0, Number(state.total_rlusd) - Number(vRlusdAmount)));
    const newVrlusd = String(Math.max(0, Number(state.total_vrlusd) - Number(vRlusdAmount)));
    await (0, queries_1.updateVaultState)(newRlusd, newVrlusd);
    return { txHash: result.result.hash ?? "" };
}
async function getVaultTVL() {
    const state = await (0, queries_1.getVaultState)();
    if (!config_1.VAULT_ACCOUNT_ADDRESS || !config_1.RLUSD_ISSUER_ADDRESS) {
        return { totalRlusd: state.total_rlusd, totalVrlusd: state.total_vrlusd };
    }
    const client = await (0, client_1.getClient)();
    const res = await client.request({
        command: "account_lines",
        account: config_1.VAULT_ACCOUNT_ADDRESS,
        ledger_index: "validated",
    });
    const lines = res.result.lines ?? [];
    const rlusdLine = lines.find((l) => l.currency === config_1.RLUSD_CURRENCY && l.account === config_1.RLUSD_ISSUER_ADDRESS);
    const totalRlusd = rlusdLine ? String(Math.abs(Number(rlusdLine.balance ?? 0))) : state.total_rlusd;
    const totalVrlusd = state.total_vrlusd;
    return { totalRlusd, totalVrlusd };
}
//# sourceMappingURL=vault.js.map