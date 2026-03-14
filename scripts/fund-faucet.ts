import { Client } from "xrpl";

const NETWORK_URL =
  process.env.XRPL_NETWORK_URL ?? "wss://s.altnet.rippletest.net:51233";
const CONNECTION_TIMEOUT_MS = Number(process.env.XRPL_CONNECTION_TIMEOUT_MS) || 20000;

async function main() {
  const addresses = process.argv.slice(2);
  if (addresses.length === 0) {
    // eslint-disable-next-line no-console
    console.error("Usage: ts-node fund-faucet.ts <address1> <address2> ...");
    process.exit(1);
  }

  const client = new Client(NETWORK_URL, { connectionTimeout: CONNECTION_TIMEOUT_MS });
  await client.connect();

  try {
    const { wallet: faucetWallet } = await client.fundWallet();
    for (const addr of addresses) {
      const payment = {
        TransactionType: "Payment",
        Account: faucetWallet.address,
        Destination: addr,
        Amount: "100000000", // 100 XRP in drops
      } as const;
      const prepared = await client.autofill(payment);
      const signed = faucetWallet.sign(prepared);
      const result = await client.submitAndWait(signed.tx_blob);
      console.log(`Funded ${addr}:`, (result.result as any).engine_result ?? (result.result as any).meta?.TransactionResult);
    }
  } finally {
    await client.disconnect();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

