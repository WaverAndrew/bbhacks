"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEscrow = createEscrow;
exports.finishEscrow = finishEscrow;
/**
 * XRPL escrows (skill-aligned): autofill for LastLedgerSequence, submitAndWait for validation.
 */
const xrpl_1 = require("xrpl");
const client_1 = require("./client");
async function createEscrow(params) {
    const { fromSeed, destination, amount, finishAfter, cancelAfter, memo } = params;
    const client = await (0, client_1.getClient)();
    const wallet = xrpl_1.Wallet.fromSeed(fromSeed);
    const tx = {
        TransactionType: "EscrowCreate",
        Account: wallet.address,
        Destination: destination,
        Amount: amount,
    };
    if (finishAfter)
        tx.FinishAfter = finishAfter;
    if (cancelAfter)
        tx.CancelAfter = cancelAfter;
    if (memo) {
        tx.Memos = [
            {
                Memo: {
                    MemoData: Buffer.from(memo, "utf8").toString("hex"),
                },
            },
        ];
    }
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    return result;
}
async function finishEscrow(params) {
    const { fromSeed, owner, offerSequence } = params;
    const client = await (0, client_1.getClient)();
    const wallet = xrpl_1.Wallet.fromSeed(fromSeed);
    const tx = {
        TransactionType: "EscrowFinish",
        Account: wallet.address,
        Owner: owner,
        OfferSequence: offerSequence,
    };
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    return result;
}
//# sourceMappingURL=escrows.js.map