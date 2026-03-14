/**
 * XRPL client (skill-aligned): explicit testnet default, maxFeeXRP for fee protection, disconnect on shutdown.
 * Connection timeout and URL follow config (see TESTING.md if connection fails).
 */
import { Client } from "xrpl";
import { XRPL_NETWORK_URL, XRPL_CONNECTION_TIMEOUT_MS } from "../config";

let client: Client | null = null;

export async function getClient(): Promise<Client> {
  if (client && client.isConnected()) {
    return client;
  }

  client = new Client(XRPL_NETWORK_URL, {
    maxFeeXRP: "0.01",
    connectionTimeout: XRPL_CONNECTION_TIMEOUT_MS,
  });
  await client.connect();
  return client;
}

export async function disconnectClient() {
  if (client && client.isConnected()) {
    await client.disconnect();
  }
}

