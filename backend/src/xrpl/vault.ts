import {
  VAULT_ACCOUNT_ADDRESS,
  VAULT_ACCOUNT_SEED,
  RLUSD_ISSUER_ADDRESS,
  RLUSD_CURRENCY,
  VRLUSD_CURRENCY,
} from "../config";
import { getClient } from "./client";
import { sendRLUSD } from "./payments";
import { getTrustLineBalance } from "./accounts";
import { getVaultState, updateVaultState } from "../db/queries";

/**
 * LP has already sent RLUSD to Vault (user signs in frontend).
 * Backend mints vRLUSD to LP proportionally (1:1 for MVP).
 */
export async function vaultDeposit(lpAddress: string, rlusdAmount: string): Promise<{ txHash: string }> {
  if (!VAULT_ACCOUNT_SEED || !VAULT_ACCOUNT_ADDRESS) {
    throw new Error("Vault not configured");
  }
  const result = await sendRLUSD({
    fromSeed: VAULT_ACCOUNT_SEED,
    toAddress: lpAddress,
    amount: rlusdAmount,
    currency: VRLUSD_CURRENCY,
    issuer: VAULT_ACCOUNT_ADDRESS,
  });
  const state = await getVaultState();
  const newRlusd = String(Number(state.total_rlusd) + Number(rlusdAmount));
  const newVrlusd = String(Number(state.total_vrlusd) + Number(rlusdAmount));
  await updateVaultState(newRlusd, newVrlusd);
  return { txHash: (result.result as any).hash ?? "" };
}

/**
 * LP sends vRLUSD back to Vault; backend sends RLUSD from Vault to LP.
 */
export async function vaultWithdraw(lpAddress: string, vRlusdAmount: string): Promise<{ txHash: string }> {
  if (!VAULT_ACCOUNT_SEED || !VAULT_ACCOUNT_ADDRESS || !RLUSD_ISSUER_ADDRESS) {
    throw new Error("Vault/issuer not configured");
  }
  const result = await sendRLUSD({
    fromSeed: VAULT_ACCOUNT_SEED,
    toAddress: lpAddress,
    amount: vRlusdAmount,
    currency: RLUSD_CURRENCY,
    issuer: RLUSD_ISSUER_ADDRESS,
  });
  const state = await getVaultState();
  const newRlusd = String(Math.max(0, Number(state.total_rlusd) - Number(vRlusdAmount)));
  const newVrlusd = String(Math.max(0, Number(state.total_vrlusd) - Number(vRlusdAmount)));
  await updateVaultState(newRlusd, newVrlusd);
  return { txHash: (result.result as any).hash ?? "" };
}

export async function getVaultTVL(): Promise<{ totalRlusd: string; totalVrlusd: string }> {
  const state = await getVaultState();
  if (!VAULT_ACCOUNT_ADDRESS || !RLUSD_ISSUER_ADDRESS) {
    return { totalRlusd: state.total_rlusd, totalVrlusd: state.total_vrlusd };
  }
  const client = await getClient();
  const res = await client.request({
    command: "account_lines",
    account: VAULT_ACCOUNT_ADDRESS,
    ledger_index: "validated",
  });
  const lines = (res.result as any).lines ?? [];
  const rlusdLine = lines.find(
    (l: any) => l.currency === RLUSD_CURRENCY && l.account === RLUSD_ISSUER_ADDRESS
  );
  const totalRlusd = rlusdLine ? String(Math.abs(Number(rlusdLine.balance ?? 0))) : state.total_rlusd;
  const totalVrlusd = state.total_vrlusd;
  return { totalRlusd, totalVrlusd };
}
