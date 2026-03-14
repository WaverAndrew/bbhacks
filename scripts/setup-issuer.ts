import { Client, Wallet, AccountSet, xrpToDrops } from "xrpl";

const NETWORK_URL =
  process.env.XRPL_NETWORK_URL ?? "wss://s.altnet.rippletest.net:51233";

async function main() {
  const client = new Client(NETWORK_URL);
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
    console.log("AccountSet result:", result.result.engine_result);
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

