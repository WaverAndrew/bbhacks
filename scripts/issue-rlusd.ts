/**
 * Send RLUSD (RLS) from issuer to a recipient address.
 * Recipient must already have a trust line to the issuer (use setup-trust.ts).
 * Usage: npx ts-node issue-rlusd.ts <recipientAddress> [amount]
 * Env: RLUSD_ISSUER_SEED, RLUSD_CURRENCY (default RLS)
 */
import { Client, Wallet } from "xrpl";

const NETWORK_URL =
  process.env.XRPL_NETWORK_URL ?? "wss://s.altnet.rippletest.net:51233";
const RLUSD_ISSUER_SEED = process.env.RLUSD_ISSUER_SEED ?? "";
const RLUSD_CURRENCY = process.env.RLUSD_CURRENCY ?? "RLS";

async function main() {
  const recipient = process.argv[2];
  const amount = process.argv[3] ?? "1000";

  if (!recipient || !RLUSD_ISSUER_SEED) {
    console.error("Usage: npx ts-node issue-rlusd.ts <recipientAddress> [amount]");
    console.error("Requires: RLUSD_ISSUER_SEED in env");
    process.exit(1);
  }

  const client = new Client(NETWORK_URL);
  await client.connect();

  try {
    const wallet = Wallet.fromSeed(RLUSD_ISSUER_SEED);
    const tx = {
      TransactionType: "Payment",
      Account: wallet.address,
      Destination: recipient,
      Amount: {
        currency: RLUSD_CURRENCY,
        issuer: wallet.address,
        value: amount,
      },
    };
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    console.log("Payment result:", (result.result as any).engine_result);
    console.log("Sent", amount, RLUSD_CURRENCY, "to", recipient);
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
