/**
 * Note: Standard EscrowCreate only supports XRP (drops string).
 * Token escrows require the TokenEscrow amendment (not yet active on mainnet/testnet).
 * Pass amount as a drops string for XRP escrows.
 */
export declare function createEscrow(params: {
    fromSeed: string;
    destination: string;
    amount: string;
    finishAfter?: number;
    cancelAfter?: number;
    memo?: string;
}): Promise<import("xrpl").TxResponse<import("xrpl").SubmittableTransaction>>;
export declare function finishEscrow(params: {
    fromSeed: string;
    owner: string;
    offerSequence: number;
}): Promise<import("xrpl").TxResponse<import("xrpl").SubmittableTransaction>>;
//# sourceMappingURL=escrows.d.ts.map