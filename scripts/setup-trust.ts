/**
 * Create a trust line from RECIPIENT_SEED wallet to RLUSD issuer so the wallet can hold RLS.
 * Requires: RLUSD_ISSUER_ADDRESS, RECIPIENT_SEED; optional RLUSD_CURRENCY (default RLS).
 */
import { Client, Wallet, TrustSet } from "xrpl";

const NETWORK_URL =
  process.env.XRPL_NETWORK_URL ?? "wss://s.altnet.rippletest.net:51233";
const RLUSD_ISSUER_ADDRESS = process.env.RLUSD_ISSUER_ADDRESS ?? "";
const RLUSD_CURRENCY = process.env.RLUSD_CURRENCY ?? "RLS";
const RECIPIENT_SEED = process.env.RECIPIENT_SEED ?? "";

async function main() {
  if (!RLUSD_ISSUER_ADDRESS || !RECIPIENT_SEED) {
    console.error("Need RLUSD_ISSUER_ADDRESS and RECIPIENT_SEED");
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
        currency: RLUSD_CURRENCY,
        issuer: RLUSD_ISSUER_ADDRESS,
        value: "1000000",
      },
    };
    const prepared = await client.autofill(trustSet);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    console.log("TrustSet result:", (result.result as any).engine_result);
    console.log("Recipient", wallet.address, "can now hold", RLUSD_CURRENCY, "from", RLUSD_ISSUER_ADDRESS);
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
