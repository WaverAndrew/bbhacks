/**
 * LP has already sent RLUSD to Vault (user signs in frontend).
 * Backend mints vRLUSD to LP proportionally (1:1 for MVP).
 */
export declare function vaultDeposit(lpAddress: string, rlusdAmount: string): Promise<{
    txHash: string;
}>;
/**
 * LP sends vRLUSD back to Vault; backend sends RLUSD from Vault to LP.
 */
export declare function vaultWithdraw(lpAddress: string, vRlusdAmount: string): Promise<{
    txHash: string;
}>;
export declare function getVaultTVL(): Promise<{
    totalRlusd: string;
    totalVrlusd: string;
}>;
//# sourceMappingURL=vault.d.ts.map