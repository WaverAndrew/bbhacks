import { Client, Wallet } from "xrpl";

type AccountSet = {
  TransactionType: "AccountSet";
  Account: string;
  SetFlag: number;
};

// XRPL skill / resources.md: Testnet = wss://s.altnet.rippletest.net:51233
// Alternatives if unreachable: wss://testnet.xrpl-labs.com or wss://clio.altnet.rippletest.net:51233
const NETWORK_URL =
  process.env.XRPL_NETWORK_URL ?? "wss://s.altnet.rippletest.net:51233";
const CONNECTION_TIMEOUT_MS = Number(process.env.XRPL_CONNECTION_TIMEOUT_MS) || 20000;

async function main() {
  const client = new Client(NETWORK_URL, { connectionTimeout: CONNECTION_TIMEOUT_MS });
  await client.connect();

  try {
    const existingSeed = process.env.RLUSD_ISSUER_SEED;
    const wallet = existingSeed
      ? Wallet.fromSeed(existingSeed)
      : Wallet.generate();

    if (!existingSeed) {
      // eslint-disable-next-line no-console
      console.log("New issuer wallet generated. Seed (store securely):");
      // eslint-disable-next-line no-console
      console.log(wallet.seed);
    }

    // Fund via faucet if on testnet/devnet.
    // eslint-disable-next-line no-console
    console.log("Funding issuer via faucet (testnet/devnet)...");
    await client.fundWallet(wallet);

    const accountSet: AccountSet = {
      TransactionType: "AccountSet",
      Account: wallet.address,
      SetFlag: 8, // asfDefaultRipple
    };

    const prepared = await client.autofill(accountSet);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);

    // eslint-disable-next-line no-console
    console.log("AccountSet result:", (result.result as any).engine_result ?? (result.result as any).meta?.TransactionResult);
    // eslint-disable-next-line no-console
    console.log("Issuer address:", wallet.address);
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

