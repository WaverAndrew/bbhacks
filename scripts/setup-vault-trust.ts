/**
 * Create a trust line from RECIPIENT_SEED wallet to the Vault so the wallet can hold vRLUSD (VRLS).
 * Required for LP deposit: backend mints vRLUSD to the LP; LP must have this trust line.
 * Requires: VAULT_ACCOUNT_ADDRESS, RECIPIENT_SEED
 */
import { Client, Wallet, TrustSet } from "xrpl";

const NETWORK_URL =
  process.env.XRPL_NETWORK_URL ?? "wss://s.altnet.rippletest.net:51233";
const VAULT_ACCOUNT_ADDRESS = process.env.VAULT_ACCOUNT_ADDRESS ?? "";
const VRLUSD_CURRENCY = "VRLS";
const RECIPIENT_SEED = process.env.RECIPIENT_SEED ?? "";

async function main() {
  if (!VAULT_ACCOUNT_ADDRESS || !RECIPIENT_SEED) {
    console.error("Need VAULT_ACCOUNT_ADDRESS and RECIPIENT_SEED");
    process.exit(1);
  }

  const client = new Client(NETWORK_URL);
  await client.connect();

  try {
    const wallet = Wallet.fromSeed(RECIPIENT_SEED);
    const trustSet: TrustSet = {
      TransactionType: "TrustSet",
      Account: wallet.address,
      LimitAmount: {
        currency: VRLUSD_CURRENCY,
        issuer: VAULT_ACCOUNT_ADDRESS,
        value: "1000000",
      },
    };
    const prepared = await client.autofill(trustSet);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    console.log("TrustSet result:", (result.result as any).engine_result);
    console.log("Recipient", wallet.address, "can now hold", VRLUSD_CURRENCY, "from Vault");
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
