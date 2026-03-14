export interface VaultState {
    total_rlusd: string;
    total_vrlusd: string;
}
export declare function getVaultState(): Promise<VaultState>;
export declare function updateVaultState(totalRlusd: string, totalVrlusd: string): Promise<void>;
export interface Voyage {
    id: string;
    route_name: string;
    insured_amount: string;
    start_date: string;
    end_date: string;
    status: string;
    created_at: string;
}
export declare function insertVoyage(v: Omit<Voyage, "created_at">): Promise<void>;
export declare function getVoyage(id: string): Promise<Voyage | undefined>;
export declare function listVoyages(status?: string): Promise<Voyage[]>;
export declare function updateVoyageStatus(id: string, status: string): Promise<void>;
export interface Policy {
    id: number;
    voyage_id: string;
    owner_address: string;
    premium_amount: string;
    nft_id: string | null;
    status: string;
    created_at: string;
}
export declare function insertPolicy(p: Omit<Policy, "id" | "created_at">): Promise<number>;
export declare function getPolicyByVoyageAndOwner(voyageId: string, owner: string): Promise<Policy | undefined>;
export declare function listPolicies(owner?: string, voyageId?: string): Promise<Policy[]>;
export declare function updatePolicyStatus(id: number, status: string): Promise<void>;
export declare function updatePolicyNftId(id: number, nftId: string): Promise<void>;
export interface Loan {
    id: number;
    borrower_address: string;
    principal: string;
    rate: string;
    due_date: string;
    status: string;
    created_at: string;
}
export declare function insertLoan(l: Omit<Loan, "id" | "created_at">): Promise<number>;
export declare function getLoan(id: number): Promise<Loan | undefined>;
export declare function listLoans(borrower?: string): Promise<Loan[]>;
export declare function updateLoanStatus(id: number, status: string): Promise<void>;
//# sourceMappingURL=queries.d.ts.map