/**
 * Mint coverage NFT (XLS-20) to issuer account (backend). Represents one policy; issuer can burn on resolve.
 */
export declare function mintCoverageNFT(voyageId: string, metadataUri: string): Promise<{
    nftId: string;
    txHash: string;
}>;
/**
 * Burn coverage NFT (e.g. on claim or expiry).
 */
export declare function burnCoverageNFT(nftId: string, ownerSeed: string): Promise<{
    txHash: string;
}>;
/**
 * Burn coverage NFT from issuer account (Coverage NFT issuer holds until we transfer; for MVP we mint to exporter so they hold it.
 * So burn is done by exporter or we need to transfer to issuer first then burn. Simpler: mint to exporter, on resolve we need exporter to burn or we use issuer with tfBurnable.
 * For MVP: we mint to exporter with tfBurnable so issuer (we) can burn. So we use COVERAGE_NFT_ISSUER_SEED to burn - but then the NFT must be held by issuer. So flow: mint to issuer, then transfer to exporter. Or mint to exporter with tfBurnable and issuer can burn from any account? No - NFTokenBurn burns from the Account that holds it. So the holder must burn. So on resolve we need the exporter to burn, which means we need exporter's signature. So for admin/oracle flow we can't burn without exporter. Alternative: mint to a "custody" account (backend) so backend can burn. So mint to coverage issuer account, and we don't transfer to exporter - we just record in DB that this NFT represents the policy. Then oracle can burn from coverage issuer. So mintCoverageNFT: mint to wallet.address (issuer). We store nft_id in policy. On resolve, we burn from issuer. Done.
 */
export declare function burnCoverageNFTByIssuer(nftId: string): Promise<{
    txHash: string;
}>;
/**
 * Mint vRLUSD from Vault to LP (used in vault deposit flow).
 */
export declare function mintVRlusd(toAddress: string, amount: string): Promise<{
    txHash: string;
}>;
//# sourceMappingURL=tokens.d.ts.map