"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBalance = getBalance;
exports.getTrustLineBalance = getTrustLineBalance;
exports.getAccountObjects = getAccountObjects;
/**
 * XRPL account queries (skill-aligned): ledger_index: 'validated' for account_info and account_lines.
 */
const client_1 = require("./client");
async function getBalance(address) {
    const client = await (0, client_1.getClient)();
    const info = await client.request({
        command: "account_info",
        account: address,
        ledger_index: "validated",
    });
    const balance = info.result.account_data?.Balance;
    const xrp = balance ? String(Number(balance) / 1e6) : "0";
    const linesRes = await client.request({
        command: "account_lines",
        account: address,
        ledger_index: "validated",
    });
    const lines = linesRes.result.lines ?? [];
    return { xrp, lines };
}
async function getTrustLineBalance(address, currency, issuer) {
    const client = await (0, client_1.getClient)();
    const res = await client.request({
        command: "account_lines",
        account: address,
        ledger_index: "validated",
    });
    const lines = res.result.lines ?? [];
    const line = lines.find((l) => l.currency === currency && l.account === issuer);
    if (!line)
        return "0";
    return String(line.balance ?? 0);
}
async function getAccountObjects(address) {
    const client = await (0, client_1.getClient)();
    const res = await client.request({
        command: "account_objects",
        account: address,
        ledger_index: "validated",
    });
    return res.result.objects ?? [];
}
//# sourceMappingURL=accounts.js.map