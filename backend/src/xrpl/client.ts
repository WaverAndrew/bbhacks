/**
 * XRPL client (skill-aligned): explicit testnet default, maxFeeXRP for fee protection, disconnect on shutdown.
 */
import { Client } from "xrpl";
import { XRPL_NETWORK_URL } from "../config";

let client: Client | null = null;

export async function getClient(): Promise<Client> {
  if (client && client.isConnected()) {
    return client;
  }

  client = new Client(XRPL_NETWORK_URL, { maxFeeXRP: "0.01" });
  await client.connect();
  return client;
}

export async function disconnectClient() {
  if (client && client.isConnected()) {
    await client.disconnect();
  }
}

