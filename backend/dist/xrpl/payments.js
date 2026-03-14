"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRLUSD = sendRLUSD;
exports.sendXRP = sendXRP;
/**
 * XRPL payments (skill-aligned):
 * - Uses autofill() for Fee, Sequence, LastLedgerSequence (reliable submission).
 * - submitAndWait() so we only return after validation, not just submission.
 * - XRP amounts via xrpToDrops(); issued currency as string value (no float).
 * - Fee protection via Client maxFeeXRP (set in client.ts).
 * - If ever processing INCOMING payments (e.g. webhooks), use meta.delivered_amount, not Amount.
 */
const xrpl_1 = require("xrpl");
const client_1 = require("./client");
async function sendRLUSD(params) {
    const { fromSeed, toAddress, amount, currency, issuer } = params;
    const client = await (0, client_1.getClient)();
    const wallet = xrpl_1.Wallet.fromSeed(fromSeed);
    const tx = {
        TransactionType: "Payment",
        Account: wallet.address,
        Destination: toAddress,
        Amount: {
            currency,
            issuer,
            value: amount,
        },
    };
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    return result;
}
async function sendXRP(params) {
    const { fromSeed, toAddress, amountXrp } = params;
    const client = await (0, client_1.getClient)();
    const wallet = xrpl_1.Wallet.fromSeed(fromSeed);
    const tx = {
        TransactionType: "Payment",
        Account: wallet.address,
        Destination: toAddress,
        Amount: (0, xrpl_1.xrpToDrops)(amountXrp),
    };
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    return result;
}
//# sourceMappingURL=payments.js.map