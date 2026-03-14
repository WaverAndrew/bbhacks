/**
 * Create a new test wallet, fund it with XRP (faucet), and optionally issue RLUSD (RLS).
 * Usage: npx ts-node create-test-wallet.ts
 * Env (optional): RLUSD_ISSUER_ADDRESS, RLUSD_ISSUER_SEED, RLUSD_CURRENCY (default RLS)
 *                 If set, trust line is created and issuer sends RLUSD to the new wallet.
 */
import { Client, Wallet } from "xrpl";

const NETWORK_URL =
  process.env.XRPL_NETWORK_URL ?? "wss://s.altnet.rippletest.net:51233";
const CONNECTION_TIMEOUT_MS =
  Number(process.env.XRPL_CONNECTION_TIMEOUT_MS) || 20000;
const RLUSD_ISSUER_ADDRESS = process.env.RLUSD_ISSUER_ADDRESS ?? "";
const RLUSD_ISSUER_SEED = process.env.RLUSD_ISSUER_SEED ?? "";
const RLUSD_CURRENCY = process.env.RLUSD_CURRENCY ?? "RLS";

async function main() {
  const client = new Client(NETWORK_URL, {
    connectionTimeout: CONNECTION_TIMEOUT_MS,
  });
  await client.connect();

  try {
    const wallet = Wallet.generate();
    console.log("--- New test wallet ---");
    console.log("Address:", wallet.address);
    console.log("Seed (save this):", wallet.seed);
    console.log("");

    console.log("Funding with XRP via faucet...");
    await client.fundWallet(wallet);
    console.log("Funded with XRP.\n");

    if (RLUSD_ISSUER_ADDRESS && RLUSD_ISSUER_SEED) {
      console.log("Setting up trust line for", RLUSD_CURRENCY, "...");
      const trustSet = {
        TransactionType: "TrustSet" as const,
        Account: wallet.address,
        LimitAmount: {
          currency: RLUSD_CURRENCY,
          issuer: RLUSD_ISSUER_ADDRESS,
          value: "1000000",
        },
      };
      const preparedTrust = await client.autofill(trustSet);
      const signedTrust = wallet.sign(preparedTrust);
      await client.submitAndWait(signedTrust.tx_blob);
      console.log("Trust line set.\n");

      const amount = "5000";
      console.log("Issuing", amount, RLUSD_CURRENCY, "from issuer...");
      const issuerWallet = Wallet.fromSeed(RLUSD_ISSUER_SEED);
      const payment = {
        TransactionType: "Payment" as const,
        Account: issuerWallet.address,
        Destination: wallet.address,
        Amount: {
          currency: RLUSD_CURRENCY,
          issuer: issuerWallet.address,
          value: amount,
        },
      };
      const preparedPay = await client.autofill(payment);
      const signedPay = issuerWallet.sign(preparedPay);
      await client.submitAndWait(signedPay.tx_blob);
      console.log("Sent", amount, RLUSD_CURRENCY, "to", wallet.address);
    } else {
      console.log(
        "Skipping RLUSD: set RLUSD_ISSUER_ADDRESS and RLUSD_ISSUER_SEED to issue RLS."
      );
    }

    console.log("\n--- Use this wallet for testing ---");
    console.log("export TEST_WALLET_SEED=" + wallet.seed);
    console.log("export TEST_WALLET_ADDRESS=" + wallet.address);
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
