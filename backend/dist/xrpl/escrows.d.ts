export declare function createEscrow(params: {
    fromSeed: string;
    destination: string;
    amount: {
        currency: string;
        issuer: string;
        value: string;
    };
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