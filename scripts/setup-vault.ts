import { Client, Wallet, TrustSet } from "xrpl";

const NETWORK_URL =
  process.env.XRPL_NETWORK_URL ?? "wss://s.altnet.rippletest.net:51233";
const RLUSD_ISSUER_ADDRESS = process.env.RLUSD_ISSUER_ADDRESS ?? "";
const RLUSD_CURRENCY = process.env.RLUSD_CURRENCY ?? "RLS";

async function main() {
  if (!RLUSD_ISSUER_ADDRESS) {
    // eslint-disable-next-line no-console
    console.error("RLUSD_ISSUER_ADDRESS env var is required");
    process.exit(1);
  }

  const client = new Client(NETWORK_URL);
  await client.connect();

  try {
    const existingSeed = process.env.VAULT_SEED;
    const vaultWallet = existingSeed
      ? Wallet.fromSeed(existingSeed)
      : Wallet.generate();

    if (!existingSeed) {
      // eslint-disable-next-line no-console
      console.log("New vault wallet generated. Seed (store securely):");
      // eslint-disable-next-line no-console
      console.log(vaultWallet.seed);
    }

    // Fund via faucet
    // eslint-disable-next-line no-console
    console.log("Funding vault via faucet (testnet/devnet)...");
    await client.fundWallet(vaultWallet);

    const trustSet: TrustSet = {
      TransactionType: "TrustSet",
      Account: vaultWallet.address,
      LimitAmount: {
        currency: RLUSD_CURRENCY,
        issuer: RLUSD_ISSUER_ADDRESS,
        value: "1000000000",
      },
    };

    const prepared = await client.autofill(trustSet);
    const signed = vaultWallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    // eslint-disable-next-line no-console
    console.log("Vault TrustSet result:", result.result.engine_result);
    // eslint-disable-next-line no-console
    console.log("Vault address:", vaultWallet.address);
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

