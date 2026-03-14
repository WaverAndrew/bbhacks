import "dotenv/config";
// XRPL skill: testnet = wss://s.altnet.rippletest.net:51233; alternatives: wss://testnet.xrpl-labs.com, wss://clio.altnet.rippletest.net:51233
export const XRPL_NETWORK_URL =
  process.env.XRPL_NETWORK_URL ?? "wss://s.altnet.rippletest.net:51233";
export const XRPL_CONNECTION_TIMEOUT_MS = Number(process.env.XRPL_CONNECTION_TIMEOUT_MS) || 20000;

export const RLUSD_ISSUER_ADDRESS = process.env.RLUSD_ISSUER_ADDRESS ?? "";
export const RLUSD_CURRENCY = process.env.RLUSD_CURRENCY ?? "RLS";
export const VAULT_ACCOUNT_ADDRESS = process.env.VAULT_ACCOUNT_ADDRESS ?? "";
export const VAULT_ACCOUNT_SEED = process.env.VAULT_ACCOUNT_SEED ?? "";
export const COVERAGE_NFT_ISSUER_SEED = process.env.COVERAGE_NFT_ISSUER_SEED ?? "";
export const ORACLE_ACCOUNT_SEED = process.env.ORACLE_ACCOUNT_SEED ?? "";
export const PORT = Number(process.env.PORT ?? "4000");
export const VRLUSD_CURRENCY = "VRL";

