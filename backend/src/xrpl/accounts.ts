/**
 * XRPL account queries (skill-aligned): ledger_index: 'validated' for account_info and account_lines.
 */
import { getClient } from "./client";

export async function getBalance(address: string): Promise<{ xrp: string; lines?: Array<{ currency: string; issuer: string; value: string }> }> {
  const client = await getClient();
  const info = await client.request({
    command: "account_info",
    account: address,
    ledger_index: "validated",
  });
  const balance = (info.result as any).account_data?.Balance;
  const xrp = balance ? String(Number(balance) / 1e6) : "0";

  const linesRes = await client.request({
    command: "account_lines",
    account: address,
    ledger_index: "validated",
  });
  const lines = (linesRes.result as any).lines ?? [];

  return { xrp, lines };
}

export async function getTrustLineBalance(
  address: string,
  currency: string,
  issuer: string
): Promise<string> {
  const client = await getClient();
  const res = await client.request({
    command: "account_lines",
    account: address,
    ledger_index: "validated",
  });
  const lines = (res.result as any).lines ?? [];
  const line = lines.find(
    (l: any) => l.currency === currency && l.account === issuer
  );
  if (!line) return "0";
  return String(line.balance ?? 0);
}

export async function getAccountObjects(address: string): Promise<any[]> {
  const client = await getClient();
  const res = await client.request({
    command: "account_objects",
    account: address,
    ledger_index: "validated",
  });
  return (res.result as any).objects ?? [];
}
