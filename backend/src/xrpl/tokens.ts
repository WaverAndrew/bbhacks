/**
 * XRPL tokens (skill-aligned): NFT mint/burn, vRLUSD mint.
 * - autofill() for LastLedgerSequence; submitAndWait() for validation.
 * - Fee protection via Client maxFeeXRP (client.ts). String amounts only (no float).
 */
import { Wallet } from "xrpl";
import { getClient } from "./client";
import { VAULT_ACCOUNT_ADDRESS, VAULT_ACCOUNT_SEED, COVERAGE_NFT_ISSUER_SEED } from "../config";

/**
 * Mint coverage NFT (XLS-20) to issuer account (backend). Represents one policy; issuer can burn on resolve.
 */
export async function mintCoverageNFT(voyageId: string, metadataUri: string): Promise<{ nftId: string; txHash: string }> {
  if (!COVERAGE_NFT_ISSUER_SEED) {
    throw new Error("COVERAGE_NFT_ISSUER_SEED not set");
  }
  const client = await getClient();
  const wallet = Wallet.fromSeed(COVERAGE_NFT_ISSUER_SEED);
  const tx = {
    TransactionType: "NFTokenMint",
    Account: wallet.address,
    NFTokenTaxon: 0,
    URI: Buffer.from(metadataUri, "utf8").toString("hex").slice(0, 256),
    Flags: 9, // tfTransferable | tfBurnable so issuer can burn
    TransferFee: 0,
  };
  const prepared = await client.autofill(tx as any);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  const meta = (result.result as any).meta;
  let nftId = "";
  if (meta?.affected_nodes) {
    for (const n of meta.affected_nodes) {
      const created = n.CreatedNode;
      if (created?.LedgerEntryType === "NFTokenPage" && created.NewFields?.NFTokens?.length) {
        nftId = created.NewFields.NFTokens[0].NFToken.NFTokenID;
        break;
      }
    }
  }
  return { nftId, txHash: (result.result as any).hash ?? "" };
}

/**
 * Burn coverage NFT (e.g. on claim or expiry).
 */
export async function burnCoverageNFT(nftId: string, ownerSeed: string): Promise<{ txHash: string }> {
  const client = await getClient();
  const wallet = Wallet.fromSeed(ownerSeed);
  const tx = {
    TransactionType: "NFTokenBurn",
    Account: wallet.address,
    NFTokenID: nftId,
  };
  const prepared = await client.autofill(tx as any);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  return { txHash: (result.result as any).hash ?? "" };
}

/**
 * Burn coverage NFT from issuer account (Coverage NFT issuer holds until we transfer; for MVP we mint to exporter so they hold it.
 * So burn is done by exporter or we need to transfer to issuer first then burn. Simpler: mint to exporter, on resolve we need exporter to burn or we use issuer with tfBurnable.
 * For MVP: we mint to exporter with tfBurnable so issuer (we) can burn. So we use COVERAGE_NFT_ISSUER_SEED to burn - but then the NFT must be held by issuer. So flow: mint to issuer, then transfer to exporter. Or mint to exporter with tfBurnable and issuer can burn from any account? No - NFTokenBurn burns from the Account that holds it. So the holder must burn. So on resolve we need the exporter to burn, which means we need exporter's signature. So for admin/oracle flow we can't burn without exporter. Alternative: mint to a "custody" account (backend) so backend can burn. So mint to coverage issuer account, and we don't transfer to exporter - we just record in DB that this NFT represents the policy. Then oracle can burn from coverage issuer. So mintCoverageNFT: mint to wallet.address (issuer). We store nft_id in policy. On resolve, we burn from issuer. Done.
 */
export async function burnCoverageNFTByIssuer(nftId: string): Promise<{ txHash: string }> {
  if (!COVERAGE_NFT_ISSUER_SEED) {
    throw new Error("COVERAGE_NFT_ISSUER_SEED not set");
  }
  return burnCoverageNFT(nftId, COVERAGE_NFT_ISSUER_SEED);
}

/**
 * Mint vRLUSD from Vault to LP (used in vault deposit flow).
 */
export async function mintVRlusd(toAddress: string, amount: string): Promise<{ txHash: string }> {
  if (!VAULT_ACCOUNT_SEED || !VAULT_ACCOUNT_ADDRESS) {
    throw new Error("Vault not configured");
  }
  const client = await getClient();
  const wallet = Wallet.fromSeed(VAULT_ACCOUNT_SEED);
  const tx = {
    TransactionType: "Payment",
    Account: wallet.address,
    Destination: toAddress,
    Amount: {
      currency: "VRLS",
      issuer: VAULT_ACCOUNT_ADDRESS,
      value: amount,
    },
  };
  const prepared = await client.autofill(tx as any);
  const signed = wallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);
  return { txHash: (result.result as any).hash ?? "" };
}
