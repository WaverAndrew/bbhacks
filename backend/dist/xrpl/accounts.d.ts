export declare function getBalance(address: string): Promise<{
    xrp: string;
    lines?: Array<{
        currency: string;
        issuer: string;
        value: string;
    }>;
}>;
export declare function getTrustLineBalance(address: string, currency: string, issuer: string): Promise<string>;
export declare function hasTrustLine(address: string, currency: string, issuer: string): Promise<boolean>;
export declare function getAccountObjects(address: string): Promise<any[]>;
//# sourceMappingURL=accounts.d.ts.map