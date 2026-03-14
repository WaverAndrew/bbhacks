export declare function sendRLUSD(params: {
    fromSeed: string;
    toAddress: string;
    amount: string;
    currency: string;
    issuer: string;
}): Promise<import("xrpl").TxResponse<import("xrpl").SubmittableTransaction>>;
export declare function sendXRP(params: {
    fromSeed: string;
    toAddress: string;
    amountXrp: string;
}): Promise<import("xrpl").TxResponse<import("xrpl").SubmittableTransaction>>;
//# sourceMappingURL=payments.d.ts.map